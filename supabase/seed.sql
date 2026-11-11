-- SpendLens Seed Script
-- Realistic finance-grade fixtures for testing, development, and preview deployments.
-- Multi-tenant: Tenant 1 (Acme) & Tenant 2 (Beta Corp), testing all 5 roles.

-- 1. Create Default Workspace (Tenant 1: Acme Engineering Corp)
INSERT INTO workspaces (id, name, slug, monthly_budget_minor, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Engineering Corp',
  'acme-eng',
  1500000, -- $15,000.00 / month budget
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_budget_minor = EXCLUDED.monthly_budget_minor;

-- 2. Create Second Workspace (Tenant 2: Beta Innovations)
INSERT INTO workspaces (id, name, slug, monthly_budget_minor, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Beta Innovations',
  'beta-innovations',
  800000, -- $8,000.00 / month budget
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_budget_minor = EXCLUDED.monthly_budget_minor;

-- 3. Create Tenant 1 Members (All 5 Roles: owner, admin, finance, member, viewer)
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'owner', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'admin', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'finance', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'member', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014', 'viewer', NOW())
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 4. Create Tenant 2 Members
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', 'owner', NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', 'viewer', NOW())
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 5. Tenant 1 Subscriptions (Realistic Upcoming Renewals within 30-day window)
INSERT INTO subscriptions (
  id, workspace_id, vendor_name, tool_id, plan_name, category,
  seats, cost_minor, currency, billing_frequency, renewal_date,
  owner_email, status, decision_status, notes
) VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Cursor',
    'cursor',
    'Business',
    'ide_assistant',
    20,
    80000, -- $800.00 / mo ($40/seat)
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '5 days',
    'lead-architect@acme.corp',
    'active',
    'review',
    'Flagged: 5 inactive seats exceeding team size. Consider downgrading.'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    'GitHub Copilot',
    'github-copilot',
    'Enterprise',
    'ide_assistant',
    15,
    28500, -- $285.00 / mo ($19/seat)
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '12 days',
    'vp-eng@acme.corp',
    'active',
    'undecided',
    'Potential category duplication with Cursor Business.'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000001',
    'Claude Team',
    'claude-team',
    'Team',
    'chat_assistant',
    12,
    36000, -- $360.00 / mo ($30/seat)
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '18 days',
    'ai-lead@acme.corp',
    'active',
    'keep',
    'Core architecture and code review tool.'
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000001',
    'ChatGPT Team',
    'chatgpt-team',
    'Team',
    'chat_assistant',
    10,
    25000, -- $250.00 / mo ($25/seat)
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '26 days',
    'product@acme.corp',
    'active',
    'cancel',
    'Consolidation candidate: migrating workflows to Claude Team.'
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000001',
    'OpenAI API',
    'openai-api',
    'Usage Tier 4',
    'api',
    1,
    215000, -- $2,150.00 / mo
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '40 days',
    'infra@acme.corp',
    'active',
    'keep',
    'Direct backend production inference.'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Tenant 2 Subscriptions (Completely Isolated)
INSERT INTO subscriptions (
  id, workspace_id, vendor_name, tool_id, plan_name, category,
  seats, cost_minor, currency, billing_frequency, renewal_date,
  owner_email, status, decision_status, notes
) VALUES
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    'Cursor',
    'cursor',
    'Pro',
    'ide_assistant',
    5,
    10000, -- $100.00 / mo
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '10 days',
    'cto@beta.corp',
    'active',
    'keep',
    'Beta core IDE licenses'
  )
ON CONFLICT (id) DO NOTHING;
