-- Migration: Institutional Performance Indexes, Audit Log Ledger, and Anonymous Audit Retention
-- Applies strictly via versioned migration files; never manual schema tampering.

-- Safe migration reconciliation: If a legacy audits table exists with a non-text ID (e.g. UUID),
-- drop dependent legacy tables so the institutional SpendLens schema can be cleanly applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audits' AND column_name = 'id' AND data_type != 'text'
  ) THEN
    DROP TABLE IF EXISTS lead_submissions CASCADE;
    DROP TABLE IF EXISTS audits CASCADE;
  END IF;
END $$;

-- 1. Anonymous Audits Table (Supports 30-day lifecycle retention and workspace claim)
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY DEFAULT ('aud_' || floor(extract(epoch from now()) * 1000)::text),
  team_size INTEGER NOT NULL DEFAULT 4,
  use_case TEXT NOT NULL DEFAULT 'coding',
  total_monthly_spend BIGINT NOT NULL DEFAULT 0,
  total_monthly_savings BIGINT NOT NULL DEFAULT 0,
  total_annual_savings BIGINT NOT NULL DEFAULT 0,
  tool_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Immutable Administrative Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('log_' || gen_random_uuid()),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lead Submissions & Consent
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id TEXT REFERENCES audits(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT,
  role TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Unsubscribe Registry
CREATE TABLE IF NOT EXISTS unsubscribe_registry (
  email TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on New Tables
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_registry ENABLE ROW LEVEL SECURITY;

-- Audits RLS: Public can insert new anonymous audits; workspace members can view claimed audits
CREATE POLICY "Public anonymous audit creation"
  ON audits FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Public read anonymous audit by ID"
  ON audits FOR SELECT
  USING (TRUE);

-- Audit Logs RLS: Strictly restricted to 'owner' and 'admin' roles of the workspace
CREATE POLICY "Admins and owners can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = audit_logs.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can record audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = audit_logs.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- ====================================================================
-- THE THREE HOTTEST QUERIES: INSTITUTIONAL COMPOSITE INDEXES
-- ====================================================================

-- Hot Query 1: Subscriptions directory paginated sort and category filter
-- SELECT * FROM subscriptions WHERE workspace_id = $1 AND status = 'active' ORDER BY cost_minor DESC LIMIT $2 OFFSET $3;
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_status_cost
  ON subscriptions (workspace_id, status, cost_minor DESC);

-- Hot Query 2: Renewals scan for 7, 30, and 90-day notification and calendar views
-- SELECT * FROM subscriptions WHERE workspace_id = $1 AND renewal_date BETWEEN $2 AND $3 AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_window
  ON subscriptions (workspace_id, renewal_date, status);

-- Hot Query 3: Overview dashboard aggregated metric totals
-- SELECT SUM(cost_minor), COUNT(*), billing_frequency FROM subscriptions WHERE workspace_id = $1 AND status = 'active' GROUP BY billing_frequency;
CREATE INDEX IF NOT EXISTS idx_subscriptions_overview_agg
  ON subscriptions (workspace_id, status)
  INCLUDE (cost_minor, seats, billing_frequency);

-- Supplemental Index: Fast audit log timeline lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_timestamp
  ON audit_logs (workspace_id, timestamp DESC);

