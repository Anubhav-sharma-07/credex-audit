# SpendLens Engineering Devlog

This engineering log documents the actual chronological development of SpendLens, including early technical debt, corrected inaccuracies, architectural pivots, and the progression into an institutional finance-grade workspace.

---

## Retrospective Corrections & Clarifications
*The following entries explicitly correct inaccuracies stated in earlier prototype scratchpads:*
- **Correction 1 (CI Linting)**: Early notes claimed that the Day 4 CI workflow ran ESLint on every push. In reality, the initial GitHub Actions configuration only ran a basic test step with no lint gate. ESLint was not integrated into CI until the institutional quality pipeline was implemented.
- **Correction 2 (Share Redirects)**: Early notes claimed that anonymous audits immediately redirected to `/results/[id]`. In reality, the share redirect was non-functional due to App Router route nesting mismatches and missing token handling; results remained in client state until the dedicated `/api/audit` share-and-claim flow was rebuilt.
- **Correction 3 (Email Delivery)**: Early notes claimed audit report emails were actively dispatched via Resend. In reality, no emails were transmitted; API keys were unconfigured stubs, and submissions failed silently without user consent tracking. This was replaced with a verified lead capture and explicit GDPR consent architecture.

---

## Day 1 — Initial Setup & Prototype Scaffolding
- **Hours worked**: 4
- **What was done**:
  - Initialized Next.js project with TypeScript and Tailwind CSS.
  - Defined initial tool and plan data structures for AI developer tools (Cursor, Copilot, Claude, ChatGPT).
  - Drafted an early procedural audit calculation script.
- **What was learned**:
  - Procedural per-tool calculations quickly lead to code duplication and unmaintainable if/else ladders.
  - Floating-point arithmetic creates rounding errors across multi-seat configurations.
- **Blockers & Issues**:
  - TypeScript path resolution issues between `src/` and root directories.

---

## Day 2 — UI Scaffolding & Initial Persistence Attempts
- **Hours worked**: 6
- **What was done**:
  - Built initial public audit form components.
  - Attempted Supabase database connectivity for anonymous audits and leads.
  - Deployed early build to Vercel preview.
- **What was learned**:
  - API routes require strict server-side validation and cannot rely on client-side state.
- **Blockers & Issues**:
  - Component duplication and copy-pasted calculation functions.
  - Email sending was non-functional due to missing Resend production domains and unconfigured API keys.

---

## Day 3 — Public Audit & Share Route Debugging
- **Hours worked**: 7
- **What was done**:
  - Attempted to add shareable URLs for audit results.
  - Encountered Next.js App Router route nesting conflicts between `app/api/` and `src/app/api/`.
  - Added basic Supabase table insert calls for anonymous audit snapshots.
- **What was learned**:
  - Dynamic route parameters in Next.js 15+ require careful handling to avoid `undefined` route contexts.
  - Public anonymous inserts require explicit Row-Level Security policies to avoid open database vulnerabilities.
- **Blockers & Issues**:
  - The share redirect failed to execute reliably across client transitions.
  - LLM credit limits forced a temporary switch to Groq, which introduced formatting inconsistencies.

---

## Day 4 — Documentation & Early Test Attempts
- **Hours worked**: 8
- **What was done**:
  - Rebranded project to SpendLens.
  - Drafted early documentation files and wrote 5 basic unit tests.
  - Created initial GitHub Actions workflow file.
- **What was learned**:
  - 5 procedural unit tests do not provide sufficient rigor for financial calculations; property-based testing is required.
- **Blockers & Issues**:
  - The CI workflow omitted linting and static typechecking, allowing latent type errors to pass undetected.
  - Duplicate rules across tools caused double-counting of savings.

---

## Day 5 — Architectural Overhaul: Pure Deterministic Audit Engine
- **Hours worked**: 9
- **What was done**:
  - Completely rebuilt `src/lib/auditEngine.ts` as `src/modules/audit` as a pure, deterministic, side-effect-free library.
  - Replaced copy-pasted procedural logic with data-driven rules:
    ```typescript
    Rule = { id, applies(ctx), evaluate(ctx) -> Finding | null }
    ```
  - Replaced all floating-point math with 64-bit integer minor units (`MoneyMinor = bigint | number`).
  - Created verified [`pricing_catalog.ts`](src/modules/audit/pricing_catalog.ts) documenting vendor source URLs and verification dates. Resolved the ChatGPT Team conflict ($25 annual vs $30 monthly) by verifying official OpenAI pricing documentation.
  - Added single-winner conflict resolver to mathematically guarantee zero double-counting across competing rules touching the same subscription.
  - Wrote Fast-Check property-based tests verifying savings $\ge 0$, annual equals $12 \times \text{monthly}$, input order independence, and idempotency.

---

## Day 6 — Workspace Platform: Subscriptions, TanStack Table & CSV Streaming
- **Hours worked**: 10
- **What was done**:
  - Built the multi-tenant workspace platform under `app/(workspace)/`.
  - Implemented server-paginated TanStack table for Subscriptions with search, column sorting, category filters, and CSV export.
  - Built Add/Edit subscription side sheet with real-time inline validation.
  - Engineered resilient, chunk-validated CSV streaming import engine with duplicate detection and an atomic one-click rollback ledger.
  - Created the Overview dashboard displaying the four foundational metrics (Monthly Recurring, Annualized, Active Subscriptions, Potential Savings), complete with trend analysis and renewals cliffs.
  - Built the Renewals calendar with 7/30/90-day views and explicit decision tracking (`keep`, `cancel`, `review`).

---

## Day 7 — Grounded AI Layer & Numeric Post-Validation
- **Hours worked**: 9
- **What was done**:
  - Designed the AI insight module (`src/modules/ai`) with strict input isolation: the model receives only structured finding slices (IDs, enums, numbers), never free-text prompts or customer emails.
  - Built five workspace-scoped, read-only Zod-typed tool functions.
  - Enforced mandatory `[finding_id]` sentence citations.
  - Built an automated numeric post-validator ([`post_validator.ts`](src/modules/ai/post_validator.ts)) that scans the generated text and automatically rejects any answer containing numbers not present in the input findings, cleanly falling back to deterministic templates.
  - Constructed a 38-case evaluation fixture suite testing adversarial prompt injections, missing citations, cost caps, and rate limits.

---

## Day 8 — Finance-Grade Design System (Tailwind v4)
- **Hours worked**: 8
- **What was done**:
  - Defined tokens in Tailwind v4 `@theme`: Ink/charcoal `#15191F`, warm ivory `#F6F4EF`, white surfaces, burnt orange `#F28B38` (fills only), and muted green `#23734B`.
  - Verified WCAG AA contrast compliance across both Light and Dark themes. Fixed orange-on-ivory contrast failures by using charcoal text on orange fills and dark orange for text links.
  - Applied `tabular-nums` across all currency and metric columns.
  - Enforced strict anti-template rules: zero gradient heroes, zero glassmorphism, zero floating blobs, zero emojis as UI elements.

---

## Day 9 — Institutional Security & STRIDE Threat Modeling
- **Hours worked**: 10
- **What was done**:
  - Delivered comprehensive [`docs/security.md`](docs/security.md) with full STRIDE threat model matrix.
  - Configured security headers: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, and cryptographic per-request CSP nonces (`frame-ancestors 'none'`).
  - Implemented sliding-window rate limiters on all public endpoints returning HTTP 429 with `Retry-After`.
  - Enforced request body size limits (64KB JSON, 5MB CSV stream counter) with `.strict()` unknown field rejection.
  - Implemented AES-256-GCM envelope encryption with HKDF-SHA256 key derivation for OAuth tokens.
  - Built double-submit HMAC-SHA256 CSRF verification and session rotation.
  - Created immutable administrative audit log ledger and self-service tenant export/purge flows.

---

## Day 10 — Test Pyramid, Observability, Migrations & Feature Flags
- **Hours worked**: 8
- **What was done**:
  - Built Playwright end-to-end test suite (`e2e/spendlens_flow.spec.ts`) testing the complete lifecycle (`audit -> share -> signup -> subscriptions -> CSV import -> AI insight`) across Chromium, WebKit, and a 390px mobile viewport.
  - Built integration test suite for API route handlers (`src/__tests__/integration_routes.test.ts`), bringing total passing test count to 134 across 12 test files.
  - Implemented Pino-compatible structured JSON logger (`src/lib/logger.ts`) with automatic PII redaction and request ID correlation.
  - Built `/api/health` heartbeat and `/api/vitals` Web Vitals telemetry endpoints.
  - Created PostgreSQL migrations with verified composite indexes for the three hottest database queries.
  - Authored database backup/restore runbook ([`docs/database.md`](docs/database.md)) and multi-environment feature flags guide ([`docs/environments.md`](docs/environments.md)).

### Milestone 5: Institutional Multi-Tenant Postgres Architecture & Server-Authoritative Audits
- **Repository Architecture:** Implemented decoupled repository interfaces (`SubscriptionRepository`, `AuditLogRepository`, `AuditRepository`) with production `Supabase*` adapters and mock `InMemory*` adapters used exclusively during unit testing.
- **Boot Validation:** Added boot-time schema checks in `src/lib/env.ts` requiring valid Supabase and database secrets in production mode.
- **Server Components Migration:** Refactored all workspace pages (`/overview`, `/subscriptions`, `/subscriptions/[id]`, `/renewals`, `/vendors`, `/reports`, `/insights`, `/import`, `/admin/audit-logs`) from `"use client"` to Server Components executing session-bound queries with Supabase RLS policies. Interactive state isolated to lightweight Client Component islands (`OverviewClient`, `SubscriptionsClient`, etc.).
- **5 Institutional RBAC Roles:** Expanded workspace membership roles to `owner`, `admin`, `finance`, `member`, and `viewer` with `viewer` strictly read-only. Added two-tenant isolation integration test suite (`src/__tests__/rls_two_tenant.test.ts`).
- **Server-Authoritative Calculations:** Recomputed public audit spend and savings strictly through `runAuditEngine` on the server before persisting to PostgreSQL; rejected client-side mathematical claims.
- **Audit Token Hardening:** Replaced timestamp-based IDs with cryptographically secure 128-bit `share_token` random strings and dropped open public `SELECT` policies from the `audits` table.
- **Lead Submissions Schema Alignment:** Routed `/api/lead` submissions to `lead_submissions` with mandatory explicit consent checks and real HTTP 500 error propagation on database failures. Dropped legacy `leads` table.
