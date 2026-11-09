import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function SavingsComingSoonPage() {
  return (
    <ComingSoonCard
      title="Automated Savings Optimizer"
      category="Savings Optimizer"
      description="Autonomous license reclamation workflows, vendor renegotiation scripts, and auto-downgrade triggers for inactive accounts."
      plannedFeatures={[
        "1-click seat deprovisioning via SCIM",
        "Negotiation benchmark data from 500+ startups",
        "Automated cancellation letter templates",
        "Custom savings target tracking",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

