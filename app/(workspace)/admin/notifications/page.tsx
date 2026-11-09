import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function AdminNotificationsPage() {
  return (
    <ComingSoonCard
      title="Notification Preferences & Alerts"
      category="Notifications"
      description="Customize email and Slack digests for contract renewals, price increases, and budget overruns."
      plannedFeatures={[
        "Weekly executive spend summary emails",
        "30-day and 7-day contract renewal countdowns",
        "Slack webhook notifications for budget warnings",
        "Unused seat alerts after 14 days of inactivity",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

