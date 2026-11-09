import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function AdminIntegrationsPage() {
  return (
    <ComingSoonCard
      title="Accounting & Identity Integrations"
      category="Integrations"
      description="Connect directly to QuickBooks, Xero, Stripe, Brex, Ramp, and Rippling to ingest software charges automatically."
      plannedFeatures={[
        "Ramp and Brex virtual card tracking",
        "QuickBooks and Xero general ledger sync",
        "Google Workspace OAuth user sync",
        "Custom CSV and SFTP ingestion channels",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

