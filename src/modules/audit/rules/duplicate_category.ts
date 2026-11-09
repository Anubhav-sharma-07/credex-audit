import type { MultiSubscriptionRule, AuditContext, Finding, SubscriptionInput } from "../types";
import { getPricingEntry, getPricingSource, calculateListMonthlyCostMinor } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

function getMonthlyCost(sub: SubscriptionInput): number {
  if (sub.actualMonthlySpendMinor !== null && sub.actualMonthlySpendMinor !== undefined) {
    return sub.actualMonthlySpendMinor;
  }
  const catalog = getPricingEntry(sub.toolId, sub.planId);
  return catalog ? calculateListMonthlyCostMinor(catalog, sub.seats, sub.billingCycle) : 0;
}

export const duplicateCategoryRule: MultiSubscriptionRule = {
  id: "duplicate_category",
  name: "Duplicate Category & Consolidation Review",
  evaluate: (ctx: AuditContext): Finding[] => {
    const findings: Finding[] = [];
    const subs = ctx.subscriptions;

    // Check IDE Assistant overlap (e.g. Cursor, Windsurf, Copilot)
    const ideSubs = subs.filter((s) => {
      const entry = getPricingEntry(s.toolId, s.planId);
      return entry?.category === "ide_assistant" && getMonthlyCost(s) > 0;
    });

    if (ideSubs.length >= 2) {
      // Find Cursor + Windsurf or Cursor + Copilot
      const cursorSub = ideSubs.find((s) => s.toolId === "cursor");
      const windsurfSub = ideSubs.find((s) => s.toolId === "windsurf");

      if (cursorSub && windsurfSub) {
        const cursorCost = getMonthlyCost(cursorSub);
        const windsurfCost = getMonthlyCost(windsurfSub);
        const candidateToReview = cursorCost <= windsurfCost ? cursorSub : windsurfSub;
        const otherSub = candidateToReview === cursorSub ? windsurfSub : cursorSub;

        const candidateCatalog = getPricingEntry(candidateToReview.toolId, candidateToReview.planId)!;
        const otherCatalog = getPricingEntry(otherSub.toolId, otherSub.planId)!;
        const candidateCost = getMonthlyCost(candidateToReview);

        findings.push({
          id: `dup_ide_${candidateToReview.id}`,
          ruleId: "duplicate_category",
          toolId: candidateToReview.toolId,
          subscriptionId: candidateToReview.id,
          kind: "duplicate_category",
          title: `Possible duplicate category: ${candidateCatalog.planName} ${candidateCatalog.toolId} vs ${otherCatalog.planName} ${otherCatalog.toolId}`,
          description: `Your team pays for both ${candidateCatalog.toolId} and ${otherCatalog.toolId}, which both serve the IDE assistant category. Review whether your developers could standardize on one coding assistant to eliminate overlapping subscriptions.`,
          currentMonthlyMinor: candidateCost,
          projectedMonthlyMinor: 0,
          savingsMinor: candidateCost,
          confidence: "estimated",
          evidence: [
            `Both ${candidateCatalog.toolId} and ${otherCatalog.toolId} are cataloged under category 'ide_assistant'.`,
            `Current spend on ${candidateCatalog.toolId}: ${formatMinorToUsd(candidateCost)}/mo.`,
          ],
          assumptions: [
            `Assumes developers do not require disjoint IDE plugins or exclusive proprietary models.`,
            `Savings are estimated and phrased as a question to review, subject to team workflow compatibility.`,
          ],
          pricingSource: getPricingSource(candidateCatalog, ctx.referenceDate),
        });
      }
    }

    // Check Chat Assistant overlap (e.g. ChatGPT + Claude) for non-coding workflows
    if (ctx.useCase !== "coding") {
      const chatSubs = subs.filter((s) => {
        const entry = getPricingEntry(s.toolId, s.planId);
        return entry?.category === "chat_assistant" && getMonthlyCost(s) > 0;
      });

      const chatGptSub = chatSubs.find((s) => s.toolId === "chatgpt");
      const claudeSub = chatSubs.find((s) => s.toolId === "claude");

      if (chatGptSub && claudeSub) {
        const chatCost = getMonthlyCost(chatGptSub);
        const claudeCost = getMonthlyCost(claudeSub);
        const candidate = chatCost <= claudeCost ? chatGptSub : claudeSub;
        const alternate = candidate === chatGptSub ? claudeSub : chatGptSub;

        const candidateCatalog = getPricingEntry(candidate.toolId, candidate.planId)!;
        const alternateCatalog = getPricingEntry(alternate.toolId, alternate.planId)!;
        const candidateCost = getMonthlyCost(candidate);

        findings.push({
          id: `dup_chat_${candidate.id}`,
          ruleId: "duplicate_category",
          toolId: candidate.toolId,
          subscriptionId: candidate.id,
          kind: "duplicate_category",
          title: `Possible duplicate category: ${candidateCatalog.toolId} and ${alternateCatalog.toolId}`,
          description: `Your team pays for both ${candidateCatalog.toolId} and ${alternateCatalog.toolId} for ${ctx.useCase} workflows. Review whether a single frontier assistant meets your team's needs.`,
          currentMonthlyMinor: candidateCost,
          projectedMonthlyMinor: 0,
          savingsMinor: candidateCost,
          confidence: "estimated",
          evidence: [
            `Both tools provide general-purpose conversational LLMs under category 'chat_assistant'.`,
            `Reported spend on ${candidateCatalog.toolId}: ${formatMinorToUsd(candidateCost)}/mo.`,
          ],
          assumptions: [
            `For ${ctx.useCase} work, a single frontier model often satisfies team requirements.`,
            `Potential savings depend on whether specific workflow prompts rely exclusively on one provider.`,
          ],
          pricingSource: getPricingSource(candidateCatalog, ctx.referenceDate),
        });
      }
    }

    return findings;
  },
};

