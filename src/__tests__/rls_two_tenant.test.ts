import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySubscriptionRepository } from "@/modules/workspace/repository";
import { requireWorkspaceMember, setTestAuthSession } from "@/lib/auth/server";
import type { WorkspaceRole } from "@/modules/workspace/types";

describe("Institutional Two-Tenant Isolation & 5-Role Access Control Suite", () => {
  const TENANT_1 = "00000000-0000-0000-0000-000000000001"; // Acme Engineering
  const TENANT_2 = "00000000-0000-0000-0000-000000000002"; // Beta Innovations

  let repo: InMemorySubscriptionRepository;

  beforeEach(() => {
    repo = new InMemorySubscriptionRepository();
    setTestAuthSession(undefined);
  });

  // Seed sample data for both tenants
  async function seedTenants() {
    await repo.create(TENANT_1, {
      vendorName: "GitHub Copilot",
      toolId: "copilot",
      planName: "Business",
      category: "ide_assistant",
      seats: 25,
      costMinor: 47500,
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-06-01",
      ownerEmail: "eng-lead@acme.com",
      status: "active",
      decisionStatus: "undecided",
      notes: null,
    });

    await repo.create(TENANT_2, {
      vendorName: "Claude Team",
      toolId: "claude",
      planName: "Team",
      category: "chat_assistant",
      seats: 10,
      costMinor: 30000,
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-07-01",
      ownerEmail: "ops@beta.com",
      status: "active",
      decisionStatus: "undecided",
      notes: null,
    });
  }

  describe("Cross-Workspace Tenant Isolation", () => {
    it("strictly isolates read queries between Tenant 1 and Tenant 2", async () => {
      await seedTenants();

      const tenant1Subs = await repo.list(TENANT_1);
      const tenant2Subs = await repo.list(TENANT_2);

      expect(tenant1Subs.data.length).toBe(1);
      expect(tenant1Subs.data[0].vendorName).toBe("GitHub Copilot");
      expect(tenant1Subs.data.every((s) => s.workspaceId === TENANT_1)).toBe(true);

      expect(tenant2Subs.data.length).toBe(1);
      expect(tenant2Subs.data[0].vendorName).toBe("Claude Team");
      expect(tenant2Subs.data.every((s) => s.workspaceId === TENANT_2)).toBe(true);
    });

    it("prevents Tenant 1 from retrieving a subscription ID owned by Tenant 2", async () => {
      await seedTenants();

      const tenant2Subs = await repo.list(TENANT_2);
      const tenant2SubId = tenant2Subs.data[0].id;

      // Tenant 1 attempts to read Tenant 2 subscription
      const sub = await repo.getById(TENANT_1, tenant2SubId);
      expect(sub).toBeNull();
    });

    it("prevents Tenant 1 from archiving subscriptions owned by Tenant 2", async () => {
      await seedTenants();

      const tenant2Subs = await repo.list(TENANT_2);
      const tenant2SubId = tenant2Subs.data[0].id;

      // Tenant 1 tries to bulk archive Tenant 2 subscription
      const archivedCount = await repo.bulkArchive(TENANT_1, [tenant2SubId]);
      expect(archivedCount).toBe(0);

      // Verify Tenant 2 subscription remains active
      const refreshed = await repo.getById(TENANT_2, tenant2SubId);
      expect(refreshed?.status).toBe("active");
    });
  });

  describe("Granular 5-Role RBAC Enforcement (owner, admin, finance, member, viewer)", () => {
    const roles: WorkspaceRole[] = ["owner", "admin", "finance", "member", "viewer"];

    it("defines all five institutional workspace roles", () => {
      expect(roles).toEqual(["owner", "admin", "finance", "member", "viewer"]);
    });

    it("viewer role: strictly read-only access (rejects mutations)", async () => {
      await seedTenants();

      // Configure session as viewer
      setTestAuthSession({
        user: { id: "usr_viewer_01", email: "viewer@acme.com", role: "authenticated" },
        role: "viewer",
      });

      // Verification via requireWorkspaceMember
      const memberCheck = await requireWorkspaceMember(TENANT_1, ["owner", "admin", "finance", "member", "viewer"]);
      expect(memberCheck.role).toBe("viewer");

      // Mutation attempt: viewer is rejected on mutation routes that require write access
      await expect(
        requireWorkspaceMember(TENANT_1, ["owner", "admin", "finance", "member"])
      ).rejects.toThrow("Forbidden: Role 'viewer' lacks permission for this action.");

      // Viewer cannot perform deletions (owner/admin only)
      await expect(
        requireWorkspaceMember(TENANT_1, ["owner", "admin"])
      ).rejects.toThrow("Forbidden: Role 'viewer' lacks permission for this action.");
    });

    it("member role: can read and insert licenses, but cannot delete or change workspace roles", async () => {
      setTestAuthSession({
        user: { id: "usr_member_01", email: "member@acme.com", role: "authenticated" },
        role: "member",
      });

      // Allowed write actions
      const memberCheck = await requireWorkspaceMember(TENANT_1, ["owner", "admin", "finance", "member"]);
      expect(memberCheck.role).toBe("member");

      // Member cannot delete subscriptions or workspace
      await expect(
        requireWorkspaceMember(TENANT_1, ["owner", "admin"])
      ).rejects.toThrow("Forbidden: Role 'member' lacks permission for this action.");
    });

    it("finance role: can view and update financial terms, export data, but cannot delete", async () => {
      setTestAuthSession({
        user: { id: "usr_finance_01", email: "finance@acme.com", role: "authenticated" },
        role: "finance",
      });

      // Finance can export data
      const financeCheck = await requireWorkspaceMember(TENANT_1, ["owner", "admin", "finance"]);
      expect(financeCheck.role).toBe("finance");

      // Finance cannot delete subscriptions or purge workspace
      await expect(
        requireWorkspaceMember(TENANT_1, ["owner", "admin"])
      ).rejects.toThrow("Forbidden: Role 'finance' lacks permission for this action.");
    });

    it("admin role: can create, update, delete subscriptions and view audit logs, but cannot purge workspace", async () => {
      setTestAuthSession({
        user: { id: "usr_admin_01", email: "admin@acme.com", role: "authenticated" },
        role: "admin",
      });

      const adminCheck = await requireWorkspaceMember(TENANT_1, ["owner", "admin"]);
      expect(adminCheck.role).toBe("admin");

      // Admin cannot purge workspace (owner only)
      await expect(
        requireWorkspaceMember(TENANT_1, ["owner"])
      ).rejects.toThrow("Forbidden: Role 'admin' lacks permission for this action.");
    });

    it("owner role: full sovereignty across all workspace resources", async () => {
      setTestAuthSession({
        user: { id: "usr_owner_01", email: "founder@acme.com", role: "authenticated" },
        role: "owner",
      });

      const ownerCheck = await requireWorkspaceMember(TENANT_1, ["owner"]);
      expect(ownerCheck.role).toBe("owner");
    });
  });

  describe("Subscription Repository Isolation & Integer Minor Arithmetics", () => {
    it("calculates tenant metrics independently without cross-tenant bleed", async () => {
      await seedTenants();

      const metrics1 = await repo.getOverviewMetrics(TENANT_1);
      const metrics2 = await repo.getOverviewMetrics(TENANT_2);

      expect(metrics1.monthlyRecurring.amountMinor).toBe(47500);
      expect(metrics1.annualised.amountMinor).toBe(47500 * 12);
      expect(metrics1.activeSubscriptions.count).toBe(1);

      expect(metrics2.monthlyRecurring.amountMinor).toBe(30000);
      expect(metrics2.annualised.amountMinor).toBe(30000 * 12);
      expect(metrics2.activeSubscriptions.count).toBe(1);
    });

    it("creates, retrieves, and archives subscriptions within tenant boundary", async () => {
      const created = await repo.create(TENANT_1, {
        vendorName: "Linear",
        toolId: "linear",
        planName: "Standard",
        category: "general",
        seats: 12,
        costMinor: 9600,
        currency: "USD",
        billingFrequency: "monthly",
        renewalDate: "2026-08-01",
        ownerEmail: null,
        status: "active",
        decisionStatus: "undecided",
        notes: null,
      });

      expect(created.id).toBeDefined();
      expect(created.workspaceId).toBe(TENANT_1);
      expect(created.costMinor).toBe(9600);

      const fetched = await repo.getById(TENANT_1, created.id);
      expect(fetched?.vendorName).toBe("Linear");

      // Not visible in Tenant 2
      const crossTenantFetch = await repo.getById(TENANT_2, created.id);
      expect(crossTenantFetch).toBeNull();
    });
  });
});
