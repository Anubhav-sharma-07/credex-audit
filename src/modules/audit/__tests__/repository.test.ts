import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SupabaseAuditRepository,
  InMemoryAuditRepository,
  getAuditRepository,
  setTestAuditRepository,
} from "../repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Audit Repository Suite", () => {
  beforeEach(() => {
    setTestAuditRepository(null);
  });

  describe("InMemoryAuditRepository", () => {
    it("creates, retrieves, and claims audits in memory", async () => {
      const repo = new InMemoryAuditRepository();
      const created = await repo.create({
        teamSize: 5,
        useCase: "coding",
        tools: [
          { tool: "cursor", plan: "business", monthlySpend: 200, currentMonthlySpend: 200 },
        ],
        summary: "InMemory test audit",
      });

      expect(created.id).toMatch(/^aud_/);
      expect(created.shareToken).toBeDefined();
      expect(created.record.teamSize).toBe(5);

      const byToken = await repo.getByShareToken(created.shareToken);
      expect(byToken).not.toBeNull();
      expect(byToken?.id).toBe(created.id);

      const byId = await repo.getById(created.id);
      expect(byId).not.toBeNull();
      expect(byId?.summary).toBe("InMemory test audit");

      const claimed = await repo.claim(created.id, "ws_test_claimed");
      expect(claimed).toBe(true);
      const claimedRecord = await repo.getById(created.id);
      expect(claimedRecord?.isClaimed).toBe(true);
      expect(claimedRecord?.claimedWorkspaceId).toBe("ws_test_claimed");

      // Non-existent audit
      const missing = await repo.getById("aud_non_existent");
      expect(missing).toBeNull();
      const claimMissing = await repo.claim("aud_non_existent", "ws_test");
      expect(claimMissing).toBe(false);
      const missingToken = await repo.getByShareToken("token_non_existent");
      expect(missingToken).toBeNull();
    });
  });

  describe("SupabaseAuditRepository", () => {
    it("creates audit record through Supabase client", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "aud_db_123",
          share_token: "mock_token_abc",
          team_size: 4,
          use_case: "coding",
          total_monthly_spend: 160,
          total_monthly_savings: 60,
          total_annual_savings: 720,
          tool_results: [{ tool: "cursor", plan: "pro" }],
          summary: "DB test summary",
          is_claimed: false,
          claimed_workspace_id: null,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient;
      const repo = new SupabaseAuditRepository(mockClient);

      const result = await repo.create({
        teamSize: 4,
        useCase: "coding",
        tools: [{ tool: "cursor", plan: "pro", monthlySpend: 160 }],
        summary: "DB test summary",
      });

      expect(result.id).toBe("aud_db_123");
      expect(result.shareToken).toBe("mock_token_abc");
      expect(mockFrom).toHaveBeenCalledWith("audits");
    });

    it("retrieves audit by share token and by id", async () => {
      const mockRow = {
        id: "aud_db_456",
        share_token: "mock_token_def",
        team_size: 4,
        use_case: "coding",
        total_monthly_spend: 100,
        total_monthly_savings: 40,
        total_annual_savings: 480,
        tool_results: [{ tool: "claude", plan: "team" }],
        summary: "Hydrated audit",
        is_claimed: false,
        claimed_workspace_id: null,
        created_at: new Date().toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient;
      const repo = new SupabaseAuditRepository(mockClient);

      const byToken = await repo.getByShareToken("mock_token_def");
      expect(byToken?.id).toBe("aud_db_456");
      expect(byToken?.toolResults.length).toBe(1);

      const byId = await repo.getById("aud_db_456");
      expect(byId?.id).toBe("aud_db_456");
    });

    it("claims audit and returns success status", async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient;
      const repo = new SupabaseAuditRepository(mockClient);

      const success = await repo.claim("aud_db_456", "ws_claimed");
      expect(success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        is_claimed: true,
        claimed_workspace_id: "ws_claimed",
      });
    });

    it("handles not found or database errors gracefully", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient;
      const repo = new SupabaseAuditRepository(mockClient);

      const byToken = await repo.getByShareToken("unknown_token");
      expect(byToken).toBeNull();

      const byId = await repo.getById("unknown_id");
      expect(byId).toBeNull();
    });

    it("throws when database error occurs during create", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Disk full" } });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient;
      const repo = new SupabaseAuditRepository(mockClient);

      await expect(
        repo.create({ teamSize: 4, useCase: "coding", tools: [] })
      ).rejects.toThrow("Database error saving audit snapshot");
    });
  });

  describe("getAuditRepository resolver", () => {
    it("returns in-memory repo when test repo is injected or in test environment without client", () => {
      const memRepo = new InMemoryAuditRepository();
      setTestAuditRepository(memRepo);
      expect(getAuditRepository()).toBe(memRepo);

      setTestAuditRepository(null);
      const defaultRepo = getAuditRepository();
      expect(defaultRepo).toBeInstanceOf(InMemoryAuditRepository);
    });

    it("returns SupabaseAuditRepository when client is provided", () => {
      setTestAuditRepository(null);
      const mockClient = {} as SupabaseClient;
      const repo = getAuditRepository(mockClient);
      expect(repo).toBeInstanceOf(SupabaseAuditRepository);
    });
  });
});
