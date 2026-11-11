import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SupabaseSubscriptionRepository,
  InMemorySubscriptionRepository,
  getSubscriptionRepository,
  setTestSubscriptionRepository,
} from "../repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Workspace Subscription Repository Suite", () => {
  const WS_ID = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    setTestSubscriptionRepository(null);
  });

  describe("InMemorySubscriptionRepository", () => {
    it("handles full lifecycle: create, get, update, delete, bulkArchive", async () => {
      const futureDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
      const repo = new InMemorySubscriptionRepository();
      const created = await repo.create(WS_ID, {
        vendorName: "Cursor",
        toolId: "cursor",
        planName: "Pro",
        category: "ide_assistant",
        seats: 5,
        costMinor: 10000,
        currency: "USD",
        billingFrequency: "monthly",
        renewalDate: futureDate,
        ownerEmail: "lead@test.com",
        status: "active",
        decisionStatus: "undecided",
        notes: null,
      });

      expect(created.id).toBeDefined();
      expect(created.workspaceId).toBe(WS_ID);

      const fetched = await repo.getById(WS_ID, created.id);
      expect(fetched?.vendorName).toBe("Cursor");

      const updated = await repo.update(WS_ID, created.id, {
        seats: 10,
        costMinor: 20000,
        vendorName: "Cursor AI",
        toolId: "cursor",
        planName: "Business",
        category: "ide_assistant",
        billingFrequency: "annual",
        renewalDate: futureDate,
        ownerEmail: "admin@test.com",
        status: "active",
        decisionStatus: "keep",
        notes: "approved",
      });
      expect(updated.seats).toBe(10);
      expect(updated.costMinor).toBe(20000);
      expect(updated.vendorName).toBe("Cursor AI");

      const schedule = await repo.getRenewalsSchedule(WS_ID, 365);
      expect(schedule.length).toBe(1);

      const vendors = await repo.getVendorDirectory(WS_ID);
      expect(vendors.length).toBe(1);
      expect(vendors[0].vendorName).toBe("Cursor AI");

      const archived = await repo.bulkArchive(WS_ID, [created.id]);
      expect(archived).toBe(1);

      const activeList = await repo.list(WS_ID, { status: "active" });
      expect(activeList.total).toBe(0);

      const deleted = await repo.delete(WS_ID, created.id);
      expect(deleted).toBe(true);

      const afterDelete = await repo.getById(WS_ID, created.id);
      expect(afterDelete).toBeNull();
    });

    it("filters and paginates subscriptions", async () => {
      const repo = new InMemorySubscriptionRepository();
      for (let i = 1; i <= 5; i++) {
        await repo.create(WS_ID, {
          vendorName: `Tool ${i}`,
          toolId: `tool_${i}`,
          planName: "Standard",
          category: i % 2 === 0 ? "ide_assistant" : "chat_assistant",
          seats: i,
          costMinor: i * 1000,
          currency: "USD",
          billingFrequency: "monthly",
          renewalDate: `2026-06-0${i}`,
          ownerEmail: null,
          status: "active",
          decisionStatus: "undecided",
          notes: null,
        });
      }

      const paged = await repo.list(WS_ID, { page: 1, pageSize: 2 });
      expect(paged.data.length).toBe(2);
      expect(paged.total).toBe(5);
      expect(paged.totalPages).toBe(3);

      const filtered = await repo.list(WS_ID, { category: "ide_assistant" });
      expect(filtered.total).toBe(2);

      const searched = await repo.list(WS_ID, { search: "Tool 3" });
      expect(searched.total).toBe(1);
    });

    it("validates seat counts and costs on create and update", async () => {
      const repo = new InMemorySubscriptionRepository();
      await expect(
        repo.create(WS_ID, {
          vendorName: "Bad Seats",
          toolId: "bad",
          planName: "P",
          category: "general",
          seats: 0,
          costMinor: 1000,
          currency: "USD",
          billingFrequency: "monthly",
          renewalDate: null,
          ownerEmail: null,
          status: "active",
          decisionStatus: "undecided",
          notes: null,
        })
      ).rejects.toThrow("Seats must be at least 1.");

      await expect(
        repo.create(WS_ID, {
          vendorName: "Bad Cost",
          toolId: "bad",
          planName: "P",
          category: "general",
          seats: 2,
          costMinor: -500,
          currency: "USD",
          billingFrequency: "monthly",
          renewalDate: null,
          ownerEmail: null,
          status: "active",
          decisionStatus: "undecided",
          notes: null,
        })
      ).rejects.toThrow("Cost cannot be negative.");
    });
  });

  describe("SupabaseSubscriptionRepository", () => {
    const mockRow = {
      id: "sub_supabase_123",
      workspace_id: WS_ID,
      vendor_name: "Claude Team",
      tool_id: "claude",
      plan_name: "Team",
      category: "chat_assistant",
      seats: 5,
      cost_minor: 15000,
      currency: "USD",
      billing_frequency: "monthly",
      renewal_date: "2026-06-15",
      owner_email: "lead@acme.com",
      status: "active",
      decision_status: "undecided",
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("creates a subscription through Supabase client", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const sub = await repo.create(WS_ID, {
        vendorName: "Claude Team",
        toolId: "claude",
        planName: "Team",
        category: "chat_assistant",
        seats: 5,
        costMinor: 15000,
        currency: "USD",
        billingFrequency: "monthly",
        renewalDate: "2026-06-15",
        ownerEmail: "lead@acme.com",
        status: "active",
        decisionStatus: "undecided",
        notes: null,
      });

      expect(sub.id).toBe("sub_supabase_123");
      expect(sub.costMinor).toBe(15000);
    });

    it("lists subscriptions with filters, sorting, and pagination", async () => {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.range = vi.fn().mockResolvedValue({
        data: [mockRow],
        count: 1,
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(chain),
      });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const result = await repo.list(WS_ID, {
        category: "chat_assistant",
        status: "active",
        search: "Claude",
        sortBy: "vendorName",
        sortOrder: "asc",
        page: 1,
        pageSize: 10,
      });

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it("updates a subscription and handles seat/cost validation", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockRow, seats: 8, cost_minor: 24000 },
        error: null,
      });
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.select = vi.fn().mockReturnValue({ single: mockSingle });
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(chain),
      });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const updated = await repo.update(WS_ID, "sub_supabase_123", {
        seats: 8,
        costMinor: 24000,
        vendorName: "Claude Team Updated",
      });
      expect(updated.seats).toBe(8);

      await expect(
        repo.update(WS_ID, "sub_supabase_123", { seats: 0 })
      ).rejects.toThrow("Seats must be at least 1.");

      await expect(
        repo.update(WS_ID, "sub_supabase_123", { costMinor: -10 })
      ).rejects.toThrow("Cost cannot be negative.");
    });

    it("fetches single subscription by id", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const sub = await repo.getById(WS_ID, "sub_supabase_123");
      expect(sub?.id).toBe("sub_supabase_123");
    });

    it("deletes a subscription", async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const success = await repo.delete(WS_ID, "sub_supabase_123");
      expect(success).toBe(true);
    });

    it("bulk archives subscriptions", async () => {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.select = vi.fn().mockResolvedValue({ data: [{ id: "sub_1" }, { id: "sub_2" }], error: null });

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(chain),
      });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const count = await repo.bulkArchive(WS_ID, ["sub_1", "sub_2"]);
      expect(count).toBe(2);
    });

    it("queries renewals schedule and vendor directory", async () => {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.not = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.lte = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue({ data: [mockRow], error: null });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(chain),
      });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const schedule = await repo.getRenewalsSchedule(WS_ID, 60);
      expect(schedule.length).toBe(1);

      // Vendor directory query (neq chained)
      chain.neq = vi.fn().mockResolvedValue({ data: [mockRow], error: null });
      const vendors = await repo.getVendorDirectory(WS_ID);
      expect(vendors.length).toBe(1);
      expect(vendors[0].vendorName).toBe("Claude Team");
    });

    it("computes overview metrics via Supabase adapter", async () => {
      const createChain = () => {
        const c: Record<string, unknown> = {
          eq: vi.fn(() => c),
          neq: vi.fn(() => c),
          not: vi.fn(() => c),
          gte: vi.fn(() => c),
          lte: vi.fn(() => c),
          order: vi.fn(() => c),
          then: (resolve: (val: unknown) => void) => resolve({ data: [mockRow], error: null }),
        };
        return c;
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn(() => createChain()),
      });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseSubscriptionRepository(mockClient);
      const metrics = await repo.getOverviewMetrics(WS_ID);
      expect(metrics.monthlyRecurring.amountMinor).toBe(15000);
      expect(metrics.activeSubscriptions.count).toBe(1);
    });
  });

  describe("getSubscriptionRepository resolver", () => {
    it("returns injected test repo or in-memory default", () => {
      const mem = new InMemorySubscriptionRepository();
      setTestSubscriptionRepository(mem);
      expect(getSubscriptionRepository()).toBe(mem);

      setTestSubscriptionRepository(null);
      expect(getSubscriptionRepository()).toBeInstanceOf(InMemorySubscriptionRepository);
    });

    it("returns SupabaseSubscriptionRepository when client provided", () => {
      setTestSubscriptionRepository(null);
      const client = {} as SupabaseClient;
      expect(getSubscriptionRepository(client)).toBeInstanceOf(SupabaseSubscriptionRepository);
    });
  });
});
