import { describe, it, expect, beforeEach } from "vitest";
import {
  listSubscriptions,
  createSubscription,
  bulkArchiveSubscriptions,
  getVendorDirectory,
  getOverviewMetrics,
  exportSubscriptionsCsv,
  resetStore,
} from "../subscriptions";
import {
  parseAndValidateCSV,
  executeCSVImport,
  rollbackCSVImport,
} from "../csv_import";

describe("Workspace Subscriptions & Overview Module", () => {
  const testWorkspaceId = "ws_blank_test_metrics_123";

  beforeEach(async () => {
    resetStore(testWorkspaceId);
    // Populate known state
    await createSubscription(testWorkspaceId, {
      vendorName: "Cursor",
      toolId: "cursor",
      planName: "Business",
      category: "ide_assistant",
      seats: 4,
      costMinor: 16000,
      billingFrequency: "monthly",
      renewalDate: "2026-06-01",
      ownerEmail: "lead@test.com",
    });

    await createSubscription(testWorkspaceId, {
      vendorName: "Claude",
      toolId: "claude",
      planName: "Team",
      category: "chat_assistant",
      seats: 5,
      costMinor: 15000,
      billingFrequency: "monthly",
      renewalDate: "2026-06-15",
      ownerEmail: "cto@test.com",
    });
  });

  it("calculates overview metrics with integer minor units and explicit basis", async () => {
    const metrics = await getOverviewMetrics(testWorkspaceId);

    expect(metrics.monthlyRecurring.amountMinor).toBe(31000); // 16000 + 15000
    expect(metrics.monthlyRecurring.basis).toContain("active subscriptions");

    expect(metrics.annualised.amountMinor).toBe(31000 * 12);
    expect(metrics.annualised.basis).toBe("12x monthly recurring run rate");

    expect(metrics.activeSubscriptions.count).toBe(2);
    expect(metrics.activeSubscriptions.basis).toBe("currently provisioned licenses");

    expect(metrics.potentialSavings.amountMinor).toBeGreaterThanOrEqual(0);
    expect(metrics.potentialSavings.basis).toContain("evidence-backed findings");

    expect(metrics.topVendors.length).toBe(2);
  });

  it("exports subscriptions to valid CSV format with correct minor-to-major conversion", async () => {
    const subs = await listSubscriptions(testWorkspaceId);
    const csv = exportSubscriptionsCsv(subs.data);

    expect(csv).toContain("Vendor");
    expect(csv).toContain("Cursor");
    expect(csv).toContain("160.00");
    expect(csv).toContain("Claude");
    expect(csv).toContain("150.00");
  });

  it("filters vendor directory and groups billing frequencies", async () => {
    const directory = await getVendorDirectory(testWorkspaceId);
    const cursorVendor = directory.find((v) => v.vendorName === "Cursor");

    expect(cursorVendor).toBeDefined();
    expect(cursorVendor?.subscriptionCount).toBe(1);
    expect(cursorVendor?.totalMonthlyCostMinor).toBe(16000);
    expect(cursorVendor?.billingFrequencies).toEqual(["monthly"]);
  });

  it("supports bulk archive without deleting records", async () => {
    const initialList = await listSubscriptions(testWorkspaceId);
    const ids = initialList.data.map((s) => s.id);

    const archivedCount = await bulkArchiveSubscriptions(testWorkspaceId, ids);
    expect(archivedCount).toBe(2);

    const afterList = await listSubscriptions(testWorkspaceId, { status: "active" });
    expect(afterList.total).toBe(0);

    const archivedList = await listSubscriptions(testWorkspaceId, { status: "archived" });
    expect(archivedList.total).toBe(2);
  });
});

describe("CSV Import & Atomic Rollback Module", () => {
  const importWorkspaceId = "ws_test_import_456";

  it("validates headers, types, and parses valid CSV rows", () => {
    const csvContent = `Vendor,Plan,Category,Seats,Monthly Cost,Billing Cycle,Owner
GitHub Copilot,Business,ide_assistant,3,$57.00,monthly,dev@test.com
ChatGPT,Team,chat_assistant,2,$60.00,monthly,pm@test.com`;

    const result = parseAndValidateCSV(csvContent, []);
    expect(result.errors.length).toBe(0);
    expect(result.validRows.length).toBe(2);
    expect(result.validRows[0].vendorName).toBe("GitHub Copilot");
    expect(result.validRows[0].seats).toBe(3);
    expect(result.validRows[0].monthlyCostUsd).toBe(57);
  });

  it("identifies row-level validation errors for negative spend or invalid seats", () => {
    const invalidCsv = `Vendor,Plan,Category,Seats,Monthly Cost
,Pro,ide_assistant,2,$40.00
Cursor,Pro,ide_assistant,-1,$20.00
Claude,Pro,chat_assistant,3,invalid_price`;

    const result = parseAndValidateCSV(invalidCsv, []);
    expect(result.validRows.length).toBe(0);
    expect(result.errors.length).toBe(3);
    expect(result.errors.find((e) => e.column === "vendor")).toBeDefined();
    expect(result.errors.find((e) => e.column === "seats")).toBeDefined();
  });

  it("detects potential duplicates against existing subscriptions", () => {
    const existing = [{ id: "sub_exist_1", vendorName: "Cursor", planName: "Business" }];
    const csvWithDup = `Vendor,Plan,Category,Seats,Monthly Cost
Cursor,Business,ide_assistant,4,$160.00`;

    const result = parseAndValidateCSV(csvWithDup, existing);
    expect(result.potentialDuplicates.length).toBe(1);
    expect(result.potentialDuplicates[0].existingSubscriptionId).toBe("sub_exist_1");
  });

  it("executes CSV import and atomic rollback cleanly", async () => {
    const csvContent = `Vendor,Plan,Category,Seats,Monthly Cost
Windsurf,Pro,ide_assistant,2,$30.00`;

    const preview = parseAndValidateCSV(csvContent, []);
    const { importedIds } = await executeCSVImport(importWorkspaceId, preview.validRows);
    expect(importedIds.length).toBe(1);

    const afterImport = await listSubscriptions(importWorkspaceId);
    expect(afterImport.data.some((s) => s.id === importedIds[0])).toBe(true);

    const rolledBackCount = await rollbackCSVImport(importWorkspaceId, importedIds);
    expect(rolledBackCount).toBe(1);

    const afterRollback = await listSubscriptions(importWorkspaceId);
    expect(afterRollback.data.some((s) => s.id === importedIds[0])).toBe(false);
  });
});
