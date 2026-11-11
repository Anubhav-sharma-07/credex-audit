# SpendLens Security Architecture & STRIDE Threat Model

This document outlines the institutional security controls, cryptographic standards, multi-tenant isolation guarantees, and threat mitigations implemented across the SpendLens application.

---

## 1. Executive Summary & Security Principles

SpendLens is designed as an institutional, CFO-grade SaaS spend intelligence tool. Because software expenditure and contract commitments represent sensitive financial data, SpendLens adheres to four non-negotiable principles:

1. **Zero Unverifiable Claims:** We state only what our architecture actually enforces. We do not display fabricated SOC 2 compliance badges.
2. **Two-Tier Tenant Isolation:** Multi-tenancy is enforced both at the application layer (Zod validation and workspace-scoped data access queries) and at the storage layer via PostgreSQL Row-Level Security (RLS).
3. **Deterministic Rules Over LLM Hallucinations:** All pricing, discount, and seat overlap calculations are computed by pure, idempotent mathematical rule functions. The AI inference layer receives strictly typed, anonymous findings and is prevented by post-execution verifiers from inventing or altering numbers.
4. **Key Derivation from a Master Secret & Principle of Least Privilege:** Third-party OAuth tokens and secrets are encrypted at rest with AES-256-GCM using keys derived from a 256-bit master secret via HKDF-SHA256 (gated behind the `gmail_auto_sync` feature flag until a cloud KMS wraps the root keys). Out-of-band integrations request minimum read-only metadata scopes.

---

## 2. STRIDE Threat Model Matrix

The table below catalogs threats analyzed under the STRIDE methodology, their attack vectors, implemented mitigations, and automated verification gates.

| STRIDE Category | Threat & Asset Vector | Severity (Likelihood × Impact) | Architectural Mitigation | Verification Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing (S)** | **Session Hijacking / Forged Session Token:** Attacker mimics user identity or attempts session fixation across network hops. | Medium × High = **High** | Secure session cookies with `HttpOnly; Secure; SameSite=Lax`. Session rotation via `rotateSession()` upon privilege changes. Cryptographic magic links with 15-minute expiry. | Auth integration tests in `auth/server.ts`, cookie attribute assertions in `proxy.ts`. |
| **Spoofing (S)** | **Cross-Site Request Forgery (CSRF):** Malicious third-party origin attempts to execute state-changing mutations on behalf of an authenticated user. | Low × High = **Medium** | Double-submit HMAC tokens (`validateMutationCsrf()`) verified with `timingSafeEqual()`. Strict `Origin` and `Referer` domain verification on `POST`/`PUT`/`DELETE`. | CSRF unit test suite in `security.test.ts`. |
| **Tampering (T)** | **Spend & Savings Manipulation:** Client tampers with request payload to forge catalog pricing or negative spend figures. | Medium × High = **High** | Pure deterministic rule engine (`runAuditEngine`) calculates all projected costs from the tamper-proof vendor catalog. Strict minor-unit integer arithmetic prevents floating-point drift. | Property-based tests (`fast-check`) asserting `savings >= 0` and immutable minor-unit math. |
| **Tampering (T)** | **OAuth Token Ciphertext Alteration:** Attacker with database read/write access attempts to tamper with stored OAuth tokens. | Low × Critical = **High** | AES-256-GCM authenticated encryption with HKDF-SHA256 key derivation from a master secret. 16-byte cryptographic authentication tags (`tag` and `dekTag`) detect any single-bit alteration and immediately reject decryption. Feature-gated behind `gmail_auto_sync`. | Token encryption integrity test suite in `token_encryption.test.ts`. |
| **Repudiation (R)** | **Unverifiable Sensitive Actions:** Workspace user deletes subscriptions, exports data, or elevates permissions and denies the action. | Low × High = **Medium** | Immutable append-only audit log (`recordAuditLog`) recording actor email, role, IP address, user-agent, target ID, and metadata timestamp. Accessible only to admins/owners. | RBAC audit log access tests in `security.test.ts`. |
| **Information Disclosure (I)** | **Cross-Tenant Data Leakage (IDOR):** Attacker in Workspace A queries `/api/subscriptions/[id]` belonging to Workspace B. | Medium × Critical = **Critical** | Database-level PostgreSQL Row-Level Security (`is_workspace_member(ws_id)`) enforced on all tables. Dual-layer validation in application logic rejecting foreign workspace IDs. | Cross-tenant RLS isolation test suite in `security.test.ts`. |
| **Information Disclosure (I)** | **AI Prompt Leakage of Customer PII:** Model inference prompts leak raw employee emails, billing details, or prompt injections. | Medium × High = **High** | AI inference receives **only structured findings** (ids, enums, numbers, and catalog URLs). It never receives raw CSV rows or emails. Strict post-check regex rejects any unverified numbers. | AI fixture evals suite (38+ tests) checking prompt-injection resilience in `ai_evals.test.ts`. |
| **Denial of Service (D)** | **Public API Flooding / DoS:** Bot network attempts to exhaust server CPU or LLM inference tokens on public `/api/audit` or `/api/summary`. | High × Medium = **High** | Sliding-window token bucket rate limiting (`checkRateLimit`) on all public endpoints. Returns HTTP 429 with standard `Retry-After` header. | Rate limiting tests asserting 429 throttling in `security.test.ts`. |
| **Denial of Service (D)** | **Payload Exhaustion / Zip-Bomb CSV:** Attacker streams multi-gigabyte files to crash server memory. | Medium × High = **High** | Two-phase payload size check (`parseAndValidateBody`): `Content-Length` inspection followed by streaming byte-counter aborting uploads exceeding 64KB (JSON) or 5MB (CSV). | Upload limit tests with oversized and malformed files in `security.test.ts`. |
| **Elevation of Privilege (E)** | **Privilege Escalation via Proxy Bypass:** Attacker attempts direct route access relying on missing proxy checks. | Low × Critical = **Critical** | Server-side session verification executed **both in `proxy.ts` and independently inside every server action and route handler** via `getSessionUser()`. Never relies on proxy alone. | Server action authorization tests. |
| **Elevation of Privilege (E)** | **Parameter Injection / Unknown Fields:** Attacker injects unauthorized fields (e.g. `role: "admin"`) into registration or update payloads. | Medium × High = **High** | Strict Zod schemas (`.strict()`) on every endpoint rejecting any unrecognized keys with HTTP 400. | Zod schema validation tests in `request_validation.ts`. |

---

## 3. Defense-in-Depth Security Controls

### 3.1 HTTP Security Headers
Configured in `next.config.ts` and dynamically injected in `proxy.ts`:
- **Content-Security-Policy (CSP):** Dynamic cryptographic nonce (`'nonce-${nonce}'`), `'strict-dynamic'`, `object-src 'none'`, and `frame-ancestors 'none'`. Blocks inline script execution and unauthorized iframe embedding.
- **Strict-Transport-Security (HSTS):** `max-age=63072000; includeSubDomains; preload` (2 years). Forces HTTPS and browser preloading.
- **X-Content-Type-Options:** `nosniff` preventing MIME-type sniffing.
- **X-Frame-Options:** `DENY` preventing clickjacking.
- **Referrer-Policy:** `strict-origin-when-cross-origin` preventing referrer credential leakage.
- **Permissions-Policy:** `camera=(), microphone=(), geolocation=(), payment=(), usb=()`.

### 3.2 OAuth Token Encryption at Rest (Key Derivation from Master Secret)
Implemented in `src/modules/security/token_encryption.ts` (gated behind `gmail_auto_sync` feature flag):
- **Key Derivation:** Master Secret $\to$ Key Encryption Key (KEK derived via HKDF-SHA256) $\to$ Per-token Data Encryption Key (DEK generated via `crypto.randomBytes(32)`). Called key derivation from a master secret pending cloud KMS integration.
- **Cipher:** AES-256-GCM with 96-bit unique IV and 128-bit authentication tag.
- **Minimum Scopes:** Google OAuth requests only `https://www.googleapis.com/auth/gmail.readonly` for billing invoice extraction. Never requests write, send, or full mailbox access.
- **Revoke & Delete Flow:** `revokeAndDeleteToken()` contacts provider revocation endpoints, wipes DEKs from memory, and cascades deletion in Postgres.

### 3.3 Multi-Tenant Row-Level Security
Configured in `supabase/migrations/20260515000000_spend_lens_schema.sql`:
- All tables (`workspaces`, `subscriptions`, `price_history`, `csv_imports`, `audit_logs`) have RLS enabled.
- PostgreSQL security definer function `is_workspace_member(ws_id)` validates tenant membership against `auth.uid()` before returning any row.
- Write and delete operations require verified `admin` or `owner` roles in `workspace_members`.

### 3.4 Rate Limiting & DoS Protection
Implemented in `src/modules/security/rate_limiter.ts`:
- Sliding-window algorithm tracking request timestamps per client IP and workspace account.
- Thresholds:
  - `/api/audit`: 20 req/min
  - `/api/summary`: 10 req/min
  - `/api/lead`: 5 req/min
  - `/api/insights`: 30 req/min
  - `/import`: 15 req/min
- Responses over threshold return HTTP 429 with `Retry-After: <seconds>`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and a structured JSON error body.

### 3.5 Privacy, Retention & Right-to-be-Forgotten
Implemented in `src/modules/security/retention.ts`:
- **Anonymous Audit Pruning:** Unclaimed diagnostic audits older than 30 days are automatically pruned via `purgeExpiredAnonymousAudits(30)`.
- **Tenant Data Export:** `exportWorkspaceData()` bundles all subscriptions, price history, and audit trails into a machine-readable JSON package for GDPR Article 20 portability.
- **Workspace Hard Deletion:** `hardDeleteWorkspace()` executes permanent cascading deletion of all tenant data for GDPR Article 17 right-to-be-forgotten compliance.
- **Unsubscribe & Consent:** Lead capture requires explicit consent checkboxes; `registerUnsubscribe()` prevents further communications.

### 3.6 Supply Chain & Dependency Hygiene
Configured in `.github/workflows/ci.yml` and `.github/dependabot.yml`:
- **Automated Dependency Updates:** Daily Dependabot scans for npm and GitHub Actions packages.
- **Secret Scanning:** Gitleaks automated scanning in CI and pre-commit (`.gitleaks.toml`) preventing secret or API key commits.
- **Vulnerability Gate:** CI pipeline enforces `npm audit --omit=dev --audit-level=high` before testing and compilation.
- **Strict Lockfile:** Builds use `npm ci` ensuring deterministic package installations without untracked drift.

