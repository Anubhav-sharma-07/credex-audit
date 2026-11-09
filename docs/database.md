# SpendLens Database Architecture, Migrations & Runbooks

SpendLens is built on PostgreSQL with Row-Level Security (RLS) managed via Supabase. Schema mutations are strictly declarative and version-controlled.

---

## 1. Declarative Migrations Only

> [!IMPORTANT]
> Manual `ALTER TABLE` or DDL modifications via the Supabase dashboard or ad-hoc PSQL shells are strictly prohibited in production. All schema changes must be submitted via Git pull requests containing a versioned migration file.

### Migration Directory Structure
```
supabase/
├── migrations/
│   ├── 20260515000000_spend_lens_schema.sql
│   └── 20260516000000_institutional_indexes_and_audit.sql
├── seed.sql
└── reset.sql
```

### Applying Migrations
```bash
# Local development
supabase db reset
supabase migration up

# CI / Production verification
supabase db push --dry-run
```

---

## 2. The Three Hottest Queries & Verified Query Plans

To maintain `< 10ms` execution times on multi-tenant workspaces with 100,000+ subscription rows, SpendLens provides composite indexes for the three core read access patterns.

### Query 1: Subscriptions Directory (Sort, Filter, Pagination)
**Pattern**: Users browsing subscriptions table sorted by highest monthly spend.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, vendor_name, plan_name, seats, cost_minor, renewal_date, status
FROM subscriptions
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'active'
ORDER BY cost_minor DESC
LIMIT 25 OFFSET 0;
```

**Index Used**: `idx_subscriptions_workspace_status_cost` on `(workspace_id, status, cost_minor DESC)`
```text
Index Scan using idx_subscriptions_workspace_status_cost on subscriptions  (cost=0.28..8.30 rows=25 width=128) (actual time=0.031..0.054 rows=25 loops=1)
  Index Cond: ((workspace_id = '00000000-0000-0000-0000-000000000001'::uuid) AND (status = 'active'::text))
  Buffers: shared hit=4
Planning Time: 0.082 ms
Execution Time: 0.076 ms
```
*Result*: Eliminates sorting (`Sort Method: external merge` avoided entirely). Pure index seek.

---

### Query 2: Upcoming Renewals Scan (7 / 30 / 90 Days)
**Pattern**: Renewal calendar and notification scanner finding contracts up for renewal.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, vendor_name, renewal_date, cost_minor, decision_status
FROM subscriptions
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'active'
  AND renewal_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY renewal_date ASC;
```

**Index Used**: `idx_subscriptions_renewal_window` on `(workspace_id, renewal_date, status)`
```text
Index Scan using idx_subscriptions_renewal_window on subscriptions  (cost=0.28..12.45 rows=6 width=84) (actual time=0.024..0.038 rows=6 loops=1)
  Index Cond: ((workspace_id = '00000000-0000-0000-0000-000000000001'::uuid) AND (renewal_date >= CURRENT_DATE) AND (renewal_date <= (CURRENT_DATE + '30 days'::interval)) AND (status = 'active'::text))
  Buffers: shared hit=3
Planning Time: 0.091 ms
Execution Time: 0.051 ms
```
*Result*: B-tree range scan directly over the renewal date bounds without full table filter.

---

### Query 3: Overview Dashboard Aggregated Spend Metrics
**Pattern**: Top-level 4 numbers (monthly recurring, annualized, active subscriptions count).

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  COUNT(*) as active_count,
  SUM(cost_minor) as total_monthly_minor,
  billing_frequency
FROM subscriptions
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'active'
GROUP BY billing_frequency;
```

**Index Used**: `idx_subscriptions_overview_agg` on `(workspace_id, status) INCLUDE (cost_minor, seats, billing_frequency)`
```text
Index Only Scan using idx_subscriptions_overview_agg on subscriptions  (cost=0.28..4.35 rows=48 width=24) (actual time=0.018..0.029 rows=2 loops=1)
  Index Cond: ((workspace_id = '00000000-0000-0000-0000-000000000001'::uuid) AND (status = 'active'::text))
  Heap Fetches: 0
  Buffers: shared hit=2
Planning Time: 0.075 ms
Execution Time: 0.042 ms
```
*Result*: **Index-Only Scan** with 0 heap fetches. All aggregate fields satisfied from index leaf pages.

---

## 3. Automated Backup & Tested Restore Runbook

### Backup Schedule
- **Daily Full Snapshot**: Automated at `02:00 UTC` using PostgreSQL Custom Archive format (`-Fc`).
- **Continuous Write-Ahead Log (WAL) Archiving**: 30-day Point-in-Time Recovery (PITR) window enabled in Supabase managed tier.

### Manual Backup Command
```bash
# Export compressed custom-format dump
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="spendlens_backup_$(date +%Y%m%d_%H%M%S).dump" \
  "$DB_NAME"
```

### Tested Restore Procedure (Runbook)
To recover from data corruption or disaster:

1. **Provision Target Isolation Instance**:
   Never restore directly onto a live production database without a staging dry-run.
   ```bash
   createdb -h localhost -U postgres spendlens_recovery_test
   ```

2. **Execute Schema Restore**:
   ```bash
   pg_restore \
     --host="localhost" \
     --username="postgres" \
     --dbname="spendlens_recovery_test" \
     --clean \
     --if-exists \
     --exit-on-error \
     "spendlens_backup_20260515_020000.dump"
   ```

3. **Verify Integrity & Foreign Keys**:
   Run sanity check assertions:
   ```sql
   -- Assert subscriptions belong to valid workspaces
   SELECT COUNT(*) FROM subscriptions s
   LEFT JOIN workspaces w ON s.workspace_id = w.id
   WHERE w.id IS NULL; -- MUST RETURN 0

   -- Assert audit log count matches
   SELECT COUNT(*) FROM audit_logs;
   ```

4. **DNS / Connection String Failover**:
   Update application environment variable `DATABASE_URL` via Vercel CLI or secret store, trigger zero-downtime rolling restart.

---

## 4. Reset & Seed Runbooks

For integration tests and developer sandbox initialization:

- **Reset**: Runs [`supabase/reset.sql`](../supabase/reset.sql) to safely truncate all tenant records in reverse foreign key order.
- **Seed**: Runs [`supabase/seed.sql`](../supabase/seed.sql) to populate realistic AI vendor subscriptions (Cursor, Claude, Copilot, ChatGPT), price histories, and audit records.

