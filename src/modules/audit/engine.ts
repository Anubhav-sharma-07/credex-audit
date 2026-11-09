import type { AuditContext, AuditEngineResult, Finding } from "./types";
import { SINGLE_SUBSCRIPTION_RULES, MULTI_SUBSCRIPTION_RULES } from "./rules";
import { resolveFindings } from "./resolver";
import { generateForecast } from "./forecast";
import { detectStaleCatalogWarnings } from "./pricing_catalog";

export const CATALOG_VERSION = "2026.05-v1";

/**
 * Pure, deterministic audit engine.
 *
 * Invariants:
 * 1. Output is strictly a pure function of AuditContext.
 * 2. Independent of subscription array order.
 * 3. Never double counts savings across findings.
 * 4. Stale pricing warnings flagged when catalog verification exceeds 60 days.
 */
export function runAuditEngine(rawCtx: AuditContext): AuditEngineResult {
  const referenceDate = rawCtx.referenceDate || new Date().toISOString();
  
  // Sort subscriptions by ID deterministically to ensure input-order independence
  const sortedSubscriptions = [...rawCtx.subscriptions].sort((a, b) => a.id.localeCompare(b.id));

  const ctx: AuditContext = {
    ...rawCtx,
    referenceDate,
    subscriptions: sortedSubscriptions,
  };

  const allRawFindings: Finding[] = [];

  // Evaluate single-subscription rules
  for (const sub of ctx.subscriptions) {
    for (const rule of SINGLE_SUBSCRIPTION_RULES) {
      if (rule.applies(ctx, sub)) {
        const finding = rule.evaluate(ctx, sub);
        if (finding) {
          allRawFindings.push(finding);
        }
      }
    }
  }

  // Evaluate multi-subscription rules
  for (const multiRule of MULTI_SUBSCRIPTION_RULES) {
    const multiFindings = multiRule.evaluate(ctx);
    allRawFindings.push(...multiFindings);
  }

  // Resolve findings to prevent double-counting
  const { resolvedFindings, suppressedFindings } = resolveFindings(allRawFindings);

  // Compute forecast
  const forecast = generateForecast(ctx, resolvedFindings);

  // Identify subscriptions with unknown spend
  const unknownSpendSubscriptions = ctx.subscriptions
    .filter((s) => s.actualMonthlySpendMinor === null || s.actualMonthlySpendMinor === undefined)
    .map((s) => s.id);

  // Check catalog freshness (60-day threshold)
  const stalePricingWarnings = detectStaleCatalogWarnings(ctx.referenceDate, 60);

  return {
    findings: resolvedFindings,
    suppressedFindings,
    forecast,
    metadata: {
      generatedAt: referenceDate,
      catalogVersion: CATALOG_VERSION,
      stalePricingWarnings,
      unknownSpendSubscriptions,
    },
  };
}

