-- Migration: Institutional 5-Role RBAC (owner, admin, finance, member, viewer),
-- Secure 128-bit Random Share Tokens for Audits, and Lead Submissions Clean-up.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Update workspace_members role constraint to support 5 institutional roles
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
  CHECK (role IN ('owner', 'admin', 'finance', 'member', 'viewer'));

-- Helper function to retrieve the authenticated caller's role in a specific workspace
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id
    AND user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Update Subscriptions RLS Policies for 5-Role RBAC
DROP POLICY IF EXISTS "Workspace members can insert subscriptions" ON subscriptions;
CREATE POLICY "Workspace members can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    is_workspace_member(workspace_id) 
    AND get_workspace_role(workspace_id) IN ('owner', 'admin', 'finance', 'member')
  );

DROP POLICY IF EXISTS "Workspace members can update subscriptions" ON subscriptions;
CREATE POLICY "Workspace members can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    is_workspace_member(workspace_id) 
    AND get_workspace_role(workspace_id) IN ('owner', 'admin', 'finance', 'member')
  );

DROP POLICY IF EXISTS "Admins and owners can delete subscriptions" ON subscriptions;
CREATE POLICY "Admins and owners can delete subscriptions"
  ON subscriptions FOR DELETE
  USING (
    is_workspace_member(workspace_id) 
    AND get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- Viewers only have read access (SELECT allowed via existing 'Workspace members can view subscriptions')

-- 3. Secure Public Audits: 128-bit share_token and non-guessable random ID
ALTER TABLE audits ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE audits ALTER COLUMN id SET DEFAULT ('aud_' || encode(gen_random_bytes(12), 'hex'));

-- Drop open public SELECT policy on audits (prevents enumeration by anyone holding the public anon key)
DROP POLICY IF EXISTS "Public read anonymous audit by ID" ON audits;
DROP POLICY IF EXISTS "Public read anonymous audit by share token" ON audits;

-- 4. Clean up legacy 'leads' table if present
DROP TABLE IF EXISTS leads CASCADE;
