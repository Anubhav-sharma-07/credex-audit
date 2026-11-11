import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SupabaseAuditLogRepository,
  InMemoryAuditLogRepository,
  getAuditLogRepository,
  setTestAuditLogRepository,
} from "../repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Security Audit Log Repository Suite", () => {
  beforeEach(() => {
    setTestAuditLogRepository(null);
  });

  describe("InMemoryAuditLogRepository", () => {
    it("records and lists audit logs with role check", async () => {
      const repo = new InMemoryAuditLogRepository();
      repo.clear();

      await repo.record({
        workspaceId: "ws_log_test",
        actorId: "usr_admin",
        actorEmail: "admin@test.com",
        action: "role_change",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        metadata: { role: "admin" },
      });

      const logs = await repo.list("ws_log_test", "admin");
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe("role_change");

      // Filter by action
      const filtered = await repo.list("ws_log_test", "owner", { action: "role_change" });
      expect(filtered.length).toBe(1);

      const noMatch = await repo.list("ws_log_test", "owner", { action: "subscription_delete" });
      expect(noMatch.length).toBe(0);

      // Permission denial for member
      await expect(repo.list("ws_log_test", "member")).rejects.toThrow(
        "Permission denied: Audit logs are restricted to workspace admins and owners."
      );
    });
  });

  describe("SupabaseAuditLogRepository", () => {
    it("inserts audit log and returns mapped entry", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "log_supabase_1",
          workspace_id: "ws_db_test",
          actor_id: "usr_db",
          actor_email: "db@test.com",
          action: "csv_import",
          target_id: "import_1",
          ip_address: "1.1.1.1",
          user_agent: "agent",
          metadata: { rows: 10 },
          timestamp: new Date().toISOString(),
        },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseAuditLogRepository(mockClient);
      const entry = await repo.record({
        workspaceId: "ws_db_test",
        actorId: "usr_db",
        actorEmail: "db@test.com",
        action: "csv_import",
        targetId: "import_1",
        ipAddress: "1.1.1.1",
        userAgent: "agent",
        metadata: { rows: 10 },
      });

      expect(entry.id).toBe("log_supabase_1");
      expect(entry.action).toBe("csv_import");
    });

    it("falls back gracefully when database insert fails", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "connection timeout" },
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseAuditLogRepository(mockClient);
      const entry = await repo.record({
        workspaceId: "ws_fallback",
        actorId: "usr_1",
        actorEmail: "u@t.com",
        action: "data_export",
        ipAddress: "127.0.0.1",
        userAgent: "agent",
        metadata: {},
      });

      expect(entry.id).toMatch(/^log_/);
    });

    it("queries audit logs with filters and limits", async () => {
      const mockRows = [
        {
          id: "log_1",
          workspace_id: "ws_1",
          actor_id: "u_1",
          actor_email: "u1@test.com",
          action: "role_change",
          target_id: null,
          ip_address: "127.0.0.1",
          user_agent: "agent",
          metadata: {},
          timestamp: new Date().toISOString(),
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({ data: mockRows, error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2, order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const mockClient = { from: mockFrom } as unknown as SupabaseClient;

      const repo = new SupabaseAuditLogRepository(mockClient);
      const logs = await repo.list("ws_1", "owner", { action: "role_change", limit: 20 });
      expect(logs.length).toBe(1);
      expect(logs[0].id).toBe("log_1");
    });

    it("enforces role permissions on list", async () => {
      const repo = new SupabaseAuditLogRepository({} as SupabaseClient);
      await expect(repo.list("ws_1", "member")).rejects.toThrow("Permission denied");
      await expect(repo.list("ws_1", "viewer")).rejects.toThrow("Permission denied");
      await expect(repo.list("ws_1", "finance")).rejects.toThrow("Permission denied");
    });
  });

  describe("getAuditLogRepository resolver", () => {
    it("resolves injected test repo or in-memory default", () => {
      const mem = new InMemoryAuditLogRepository();
      setTestAuditLogRepository(mem);
      expect(getAuditLogRepository()).toBe(mem);

      setTestAuditLogRepository(null);
      expect(getAuditLogRepository()).toBeInstanceOf(InMemoryAuditLogRepository);
    });

    it("resolves SupabaseAuditLogRepository when client provided", () => {
      setTestAuditLogRepository(null);
      const client = {} as SupabaseClient;
      expect(getAuditLogRepository(client)).toBeInstanceOf(SupabaseAuditLogRepository);
    });
  });
});
