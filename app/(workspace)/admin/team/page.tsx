import ComingSoonCard from "@/components/workspace/ComingSoonCard";

export default function AdminTeamPage() {
  return (
    <ComingSoonCard
      title="Team & Role-Based Access Control"
      category="Team Management"
      description="Invite team members, assign granular workspace roles (Owner, Admin, Member, Auditor), and manage single sign-on (SSO/SAML)."
      plannedFeatures={[
        "Email invitations with 7-day expiry",
        "Role-based permissions (Auditor read-only)",
        "Okta and Google Workspace SAML SSO",
        "Audit log of member actions and seat changes",
      ]}
      targetMilestone="Q3 2026 Release"
    />
  );
}

