-- SpendLens Clean Reset Script
-- Safely empties tenant data and audits in reverse dependency order while preserving schema structure.

BEGIN;

-- Disable triggers temporarily for fast bulk truncation
SET session_replication_role = 'replica';

TRUNCATE TABLE
  lead_submissions,
  audit_logs,
  price_history,
  csv_imports,
  invitations,
  feature_waitlists,
  subscriptions,
  workspace_members,
  workspaces,
  audits,
  unsubscribe_registry
RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';

COMMIT;

