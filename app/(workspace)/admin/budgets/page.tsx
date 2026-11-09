import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function AdminBudgetsPage() {
  return (
    <ComingSoonCard
      title="Budget Allocations & Hard Caps"
      category="Budgets"
      description="Define spending limits per department and software category. Receive real-time threshold alerts before contract overages occur."
      plannedFeatures={[
        "Monthly and annual budget thresholds",
        "Overrun alerts via Slack and email",
        "Category caps (e.g., $500/mo on IDE tools)",
        "Purchase request approval workflows",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

