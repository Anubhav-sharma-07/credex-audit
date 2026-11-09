-- SpendLens Postgres Schema & Row-Level Security (RLS) Policies
-- Enforces tenant isolation twice: in Postgres RLS and in application code.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  monthly_budget_minor BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspace Members (Tenant Role-Based Access Control)
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- 3. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ide_assistant', 'chat_assistant', 'api', 'general')),
  seats INTEGER NOT NULL CHECK (seats >= 1),
  cost_minor BIGINT NOT NULL CHECK (cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('monthly', 'annual')),
  renewal_date DATE,
  owner_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'review', 'cancelled', 'archived')),
  decision_status TEXT NOT NULL DEFAULT 'undecided' CHECK (decision_status IN ('keep', 'cancel', 'review', 'undecided')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Price History (Audit trail of cost changes)
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  cost_minor BIGINT NOT NULL CHECK (cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CSV Imports & Rollback Ledger
CREATE TABLE IF NOT EXISTS csv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preview', 'completed', 'rolled_back', 'failed')),
  error_log JSONB DEFAULT '[]'::jsonb,
  imported_subscription_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Team Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Waitlist Signups (For honest Coming Soon states)
CREATE TABLE IF NOT EXISTS feature_waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, feature_name)
);

-- Enable Row-Level Security on All Tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_waitlists ENABLE ROW LEVEL SECURITY;

-- Helper security function: checks if auth.uid() is a member of the workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces Policies
CREATE POLICY "Members can view their workspaces"
  ON workspaces FOR SELECT
  USING (is_workspace_member(id));

CREATE POLICY "Owners can update workspace"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Workspace Members Policies
CREATE POLICY "Members can view co-workers in workspace"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id));

-- Subscriptions Policies
CREATE POLICY "Workspace members can view subscriptions"
  ON subscriptions FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins and owners can delete subscriptions"
  ON subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = subscriptions.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Price History Policies
CREATE POLICY "Workspace members can view price history"
  ON price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = price_history.subscription_id
        AND is_workspace_member(subscriptions.workspace_id)
    )
  );

-- CSV Imports Policies
CREATE POLICY "Workspace members can manage imports"
  ON csv_imports FOR ALL
  USING (is_workspace_member(workspace_id));

-- Invitations Policies
CREATE POLICY "Admins and owners can manage invitations"
  ON invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = invitations.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

