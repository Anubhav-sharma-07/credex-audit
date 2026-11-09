-- SpendLens Seed Script
-- Realistic finance-grade fixtures for testing, development, and preview deployments.

-- 1. Create Default Workspace
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

-- 2. Create Members
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'owner', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'admin', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'member', NOW())
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 3. Realistic Subscriptions
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
    CURRENT_DATE + INTERVAL '7 days',
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
    CURRENT_DATE + INTERVAL '24 days',
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
    CURRENT_DATE + INTERVAL '45 days',
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
    CURRENT_DATE + INTERVAL '80 days',
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
    CURRENT_DATE + INTERVAL '12 days',
    'infra@acme.corp',
    'active',
    'keep',
    'Direct backend production inference.'
  ),
  (
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000001',
    'Anthropic API',
    'anthropic-api',
    'Scale Tier',
    'api',
    1,
    180000, -- $1,800.00 / mo
    'USD',
    'monthly',
    CURRENT_DATE + INTERVAL '18 days',
    'infra@acme.corp',
    'active',
    'keep',
    'Sonnet 3.5 production API workloads.'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Price History Tracking
INSERT INTO price_history (subscription_id, effective_date, cost_minor, currency, reason)
VALUES
  ('00000000-0000-0000-0000-000000000101', CURRENT_DATE - INTERVAL '6 months', 60000, 'USD', 'Initial 15 seats tier'),
  ('00000000-0000-0000-0000-000000000101', CURRENT_DATE - INTERVAL '1 month', 80000, 'USD', 'Expanded to 20 seats')
ON CONFLICT DO NOTHING;

-- 5. Seed Audit Logs
INSERT INTO audit_logs (id, workspace_id, actor_id, actor_email, action, target_id, ip_address, user_agent, metadata)
VALUES
  (
    'log_seed_001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'admin@acme.corp',
    'subscription_create',
    '00000000-0000-0000-0000-000000000101',
    '192.168.1.10',
    'Mozilla/5.0 SpendLens/1.0',
    '{"vendor": "Cursor", "seats": 20, "cost": 80000}'::jsonb
  ),
  (
    'log_seed_002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'admin@acme.corp',
    'role_change',
    '00000000-0000-0000-0000-000000000011',
    '192.168.1.10',
    'Mozilla/5.0 SpendLens/1.0',
    '{"previousRole": "member", "newRole": "admin"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

