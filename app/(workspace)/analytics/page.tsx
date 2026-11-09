import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function AnalyticsComingSoonPage() {
  return (
    <ComingSoonCard
      title="Advanced Spend Analytics"
      category="Analytics"
      description="In-depth cost trends, department-level chargebacks, utilization heatmaps, and year-over-year forecasting across all software vendors."
      plannedFeatures={[
        "Interactive cohort utilization charts",
        "Cost per engineering pull-request metric",
        "Department-level budget allocations",
        "Historical invoice OCR parsing",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

