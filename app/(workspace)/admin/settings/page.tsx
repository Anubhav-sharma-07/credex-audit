import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function AdminSettingsPage() {
  return (
    <ComingSoonCard
      title="Workspace Settings & API Keys"
      category="Settings"
      description="Configure workspace currency, custom fiscal calendars, webhook endpoints, and data retention policies."
      plannedFeatures={[
        "Multi-currency support (EUR, GBP, JPY)",
        "Automated daily audit exports",
        "Developer API tokens and webhooks",
        "Data retention and GDPR purge controls",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

