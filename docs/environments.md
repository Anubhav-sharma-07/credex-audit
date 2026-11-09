# SpendLens Multi-Environment Architecture & Feature Flag Strategy

SpendLens operates across three isolated environments: **Local Development**, **Preview (Pull Requests)**, and **Production**. Each environment is strictly isolated with independent Supabase projects, encryption keys, and environment variables.

---

## 1. Environment Comparison Matrix

| Capability | Local Development | Preview (Ephemeral PR) | Production |
|---|---|---|---|
| **Host Domain** | `localhost:3000` | `*.spendlens-preview.vercel.app` | `app.spendlens.com` |
| **Supabase Instance** | Local Docker container or Dev Project | Dedicated Preview Supabase Project | Dedicated Production Supabase Project |
| **Auth Mode** | Mock / Local Supabase Inbucket | Supabase Auth (Test Google OAuth + Magic Link) | Supabase Auth (Strict Google OAuth + Magic Link) |
| **Encryption KEK** | Local 32-byte secret | Preview 32-byte secret | AWS KMS / Vault-managed 256-bit Key |
| **Rate Limiter** | Relaxed (100 req/min) | Standard (60 req/min) | Production Sliding-Window |
| **AI Model Ingest** | Stub / Test Fixtures | Claude 3.5 Sonnet (with $5/day preview cap) | Claude 3.5 Sonnet (Workspace-metered budget) |
| **Sentry Environment** | `development` (suppressed) | `preview` | `production` |

---

## 2. Environment Variables Configuration

| Variable | Scope | Required In Production | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | **Yes** | Supabase REST/GraphQL endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | **Yes** | Supabase public anon key for RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | **Yes** | Admin key for server mutations (never exposed to client) |
| `ENCRYPTION_MASTER_KEY` | **Server Only** | **Yes** | 64-char hex key for HKDF-SHA256 OAuth envelope encryption |
| `CSRF_SECRET` | **Server Only** | **Yes** | 64-char hex key for double-submit HMAC validation |
| `ANTHROPIC_API_KEY` | **Server Only** | **Yes** | Anthropic Claude API key for AI Insights |
| `NEXT_PUBLIC_APP_URL` | Client + Server | **Yes** | Base URL for OAuth callbacks and share links |
| `SENTRY_DSN` | Client + Server | Optional | Sentry crash reporting ingest URL |

---

## 3. Feature Flags for Unfinished Modules

To ensure continuous deployment without shipping incomplete user experiences, SpendLens uses typed feature flags defined in [`src/lib/feature_flags.ts`](../src/lib/feature_flags.ts).

### Flag Inventory

| Key | Default (Prod) | Default (Preview) | Stage | Description |
|---|---|---|---|---|
| `ai_agent_actions` | `false` | `true` | **Alpha** | Autonomous vendor action drafting (cancel/negotiate) |
| `gmail_auto_sync` | `false` | `true` | **Alpha** | Gmail OAuth receipt detection and scanning |
| `custom_integrations`| `false` | `false` | **Alpha** | ERP sync for NetSuite, QuickBooks, Xero |
| `advanced_forecasting`| `true` | `true` | **Beta** | Multi-year probabilistic renewal forecasting |
| `slack_notifications` | `false` | `true` | **Beta** | Automated webhook renewals alerts |

### Controlling Flags
Flags can be toggled without code deployment via environment variables:
```bash
# Enable Gmail auto-sync on a preview deployment
FLAG_GMAIL_AUTO_SYNC=true
```

In the UI, unfinished modules with disabled flags display an honest **"Coming Soon"** state with a waitlist toggle rather than non-functional UI placeholders.

