import type { Finding } from "./types";

/**
 * Ranks findings for a single subscription to select the primary winning recommendation.
 *
 * Ranking criteria:
 * 1. Confidence: "confirmed" > "estimated"
 * 2. Savings: higher savingsMinor wins
 * 3. Priority tier: fundamental plan/seat right-sizing > billing frequency > governance
 * 4. Deterministic tie-breaker: ruleId and id alphabetically
 */
function compareFindings(a: Finding, b: Finding): number {
  const aHasSavings = a.savingsMinor > 0;
  const bHasSavings = b.savingsMinor > 0;
  if (aHasSavings !== bHasSavings) {
    return aHasSavings ? -1 : 1;
  }
  if (a.confidence !== b.confidence) {
    return a.confidence === "confirmed" ? -1 : 1;
  }
  if (a.savingsMinor !== b.savingsMinor) {
    return b.savingsMinor - a.savingsMinor; // Higher savings first
  }

  const priorityScore = (f: Finding): number => {
    switch (f.kind) {
      case "seats_exceed_team":
        return 100;
      case "downgrade_plan":
        return 90;
      case "annual_vs_monthly":
        return 80;
      case "duplicate_category":
        return 70;
      case "price_increase":
        return 60;
      case "renewal_upcoming":
        return 50;
      case "unused_free_tier":
        return 40;
      case "missing_owner":
        return 30;
      default:
        return 0;
    }
  };

  const scoreDiff = priorityScore(b) - priorityScore(a);
  if (scoreDiff !== 0) return scoreDiff;

  return a.id.localeCompare(b.id);
}

export interface ResolutionResult {
  /** The primary findings guaranteed to not double-count any subscription */
  resolvedFindings: Finding[];
  /** Secondary or alternative findings suppressed from primary savings calculation */
  suppressedFindings: Finding[];
}

export function resolveFindings(findings: Finding[]): ResolutionResult {
  const bySubscription = new Map<string, Finding[]>();
  const workspaceFindings: Finding[] = [];

  for (const f of findings) {
    if (!f.subscriptionId) {
      workspaceFindings.push(f);
    } else {
      const list = bySubscription.get(f.subscriptionId) || [];
      list.push(f);
      bySubscription.set(f.subscriptionId, list);
    }
  }

  const resolvedFindings: Finding[] = [];
  const suppressedFindings: Finding[] = [];

  // Sort subscription IDs for deterministic output regardless of insertion order
  const sortedSubIds = Array.from(bySubscription.keys()).sort();

  for (const subId of sortedSubIds) {
    const candidateList = bySubscription.get(subId)!;
    // Sort candidates deterministically
    candidateList.sort(compareFindings);

    const winner = candidateList[0];
    const alternatives = candidateList.slice(1);

    winner.alternatives = alternatives.length > 0 ? alternatives : undefined;
    resolvedFindings.push(winner);
    suppressedFindings.push(...alternatives);
  }

  // Append workspace findings
  workspaceFindings.sort((a, b) => a.id.localeCompare(b.id));
  resolvedFindings.push(...workspaceFindings);

  return {
    resolvedFindings,
    suppressedFindings,
  };
}
