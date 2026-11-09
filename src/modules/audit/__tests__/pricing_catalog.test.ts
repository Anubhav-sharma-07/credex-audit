import { describe, it, expect } from "vitest";
import {
  getPricingEntry,
  calculateListMonthlyCostMinor,
  checkPricingStaleness,
  detectStaleCatalogWarnings,
} from "../pricing_catalog";

describe("Pricing Catalog & Conflict Resolution", () => {
  it("resolves the $25 vs $30 conflict with verified source documentation", () => {
    const claudeTeam = getPricingEntry("claude", "team");
    expect(claudeTeam).toBeDefined();
    // Monthly flex is $30/seat ($3000 minor)
    expect(claudeTeam!.monthlyPricePerSeatMinor).toBe(3000);
    // Annual commitment is $25/seat ($2500 minor)
    expect(claudeTeam!.annualPricePerSeatMinor).toBe(2500);
    expect(claudeTeam!.sourceUrl).toBe("https://www.anthropic.com/pricing");
    expect(claudeTeam!.minSeats).toBe(5);

    const chatgptTeam = getPricingEntry("chatgpt", "team");
    expect(chatgptTeam).toBeDefined();
    // Monthly flex is $30/seat ($3000 minor)
    expect(chatgptTeam!.monthlyPricePerSeatMinor).toBe(3000);
    // Annual commitment is $25/seat ($2500 minor)
    expect(chatgptTeam!.annualPricePerSeatMinor).toBe(2500);
    expect(chatgptTeam!.sourceUrl).toBe("https://openai.com/chatgpt/pricing/");
    expect(chatgptTeam!.minSeats).toBe(2);

    const windsurfTeam = getPricingEntry("windsurf", "team");
    expect(windsurfTeam).toBeDefined();
    expect(windsurfTeam!.monthlyPricePerSeatMinor).toBe(3500); // $35 monthly
    expect(windsurfTeam!.annualPricePerSeatMinor).toBe(3000);  // $30 annual
    expect(windsurfTeam!.sourceUrl).toBe("https://codeium.com/windsurf/pricing");
  });

  it("calculates list monthly costs correctly for both monthly and annual billing", () => {
    const claudeTeam = getPricingEntry("claude", "team")!;
    // 5 seats monthly @ $30/seat = $150 (15000 cents)
    expect(calculateListMonthlyCostMinor(claudeTeam, 5, "monthly")).toBe(15000);
    // 5 seats annual @ $25/seat = $125 (12500 cents)
    expect(calculateListMonthlyCostMinor(claudeTeam, 5, "annual")).toBe(12500);

    // Enforces minSeats = 5 when requested seats < 5
    expect(calculateListMonthlyCostMinor(claudeTeam, 2, "monthly")).toBe(15000);
  });

  it("detects when pricing data is older than 60 days", () => {
    const verifiedAt = "2026-01-01T00:00:00Z";
    const refFresh = "2026-02-15T00:00:00Z"; // 45 days later
    const freshCheck = checkPricingStaleness(verifiedAt, refFresh, 60);
    expect(freshCheck.isStale).toBe(false);
    expect(freshCheck.daysOld).toBe(45);

    const refStale = "2026-04-01T00:00:00Z"; // 90 days later
    const staleCheck = checkPricingStaleness(verifiedAt, refStale, 60);
    expect(staleCheck.isStale).toBe(true);
    expect(staleCheck.daysOld).toBe(90);
  });

  it("detects stale warnings across the catalog when reference date is far in future", () => {
    // Reference date set to 2026-11-01 (>60 days after catalog verifiedAt of 2026-05-10)
    const warnings = detectStaleCatalogWarnings("2026-11-01T00:00:00Z", 60);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].daysOld).toBeGreaterThan(60);

    // When reference date is near catalog date (2026-05-20), no stale warnings
    const freshWarnings = detectStaleCatalogWarnings("2026-05-20T00:00:00Z", 60);
    expect(freshWarnings.length).toBe(0);
  });
});

