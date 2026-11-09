# ADR-003: Multi-Tenant Isolation via Postgres Row-Level Security (RLS)

## Status
Accepted

## Context
SpendLens stores sensitive software contract pricing, vendor lists, and corporate financial data across multiple client organizations. A cross-tenant data leak or Insecure Direct Object Reference (IDOR) vulnerability would represent an existential security failure.

## Decision
We implemented a **Dual-Layer Tenant Isolation** model:
1. **Application Layer**: Every query, mutation, and getter explicitly filters by `workspaceId`.
2. **Postgres Kernel Layer**: Supabase Row-Level Security (RLS) policies enforce workspace tenancy directly in the database engine using a security-definer helper function `is_workspace_member(ws_id)`.

### Rationale
- **Defense-in-Depth**: If an application developer inadvertently omits a `WHERE workspace_id = $1` clause in a future query, the Postgres RLS policy automatically filters the result set to rows where `workspace_members.user_id = auth.uid()`.
- **Role-Based Granularity**: Specific administrative actions (permanent workspace purge, member role changes, tenant data export) require `role = 'owner'` or `role = 'admin'` directly in the RLS policy expression.
- **Automated Verification**: The test suite includes dedicated cross-tenant IDOR tests verifying that Workspace B cannot read, update, or delete subscriptions belonging to Workspace A.

## Consequences
- Every database query must execute within an authenticated Supabase session context or pass through verified workspace helper functions.
- Enforced by automated cross-tenant security test suites in CI.

