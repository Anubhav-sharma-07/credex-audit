# SpendLens Observability, Monitoring & Alerting Guide

SpendLens employs institutional-grade telemetry across three pillars: **Structured Logging**, **Crash Reporting & Web Vitals**, and **Synthetic Heartbeats & Alerting**.

---

## 1. Structured Logging (Pino Architecture)

All server actions, background workers, and API route handlers output NDJSON formatted logs via [`src/lib/logger.ts`](../src/lib/logger.ts).

### Schema Specification
```json
{
  "level": 30,
  "time": 1746816000000,
  "pid": 4812,
  "hostname": "spendlens-worker-01",
  "requestId": "req_1746816000000_a1b2c3d4",
  "workspaceId": "00000000-0000-0000-0000-000000000001",
  "route": "api/audit",
  "msg": "Audit evaluation computed successfully",
  "monthlySavingsUsd": 280
}
```

### Log Levels
- **`10 (trace)`**: Sub-millisecond rule evaluation branches.
- **`20 (debug)`**: Query filter states, CSV header parsing steps.
- **`30 (info)`**: Successful mutations, logins, exports, rate limit passes.
- **`40 (warn)`**: Throttled requests (429), validation failures, memory warnings.
- **`50 (error)`**: Handled database failures, upstream AI timeout fallbacks.
- **`60 (fatal)`**: Missing boot-time environment credentials, uncaught exceptions.

### Automated Redaction Rules
Logs automatically scrub:
- Passwords, OAuth refresh tokens, and session cookies (`[REDACTED]`).
- Raw user emails from telemetry events.
- Credit card numbers, service keys, and private keys.

---

## 2. Crash Reporting & Web Vitals (Sentry & Ingest)

### Error Tracking (`src/lib/sentry.ts`)
- Uncaught exceptions are captured with stack trace symbolication via Next.js production source maps.
- Sensitive request headers and cookie bodies are stripped before transmission.

### Real User Monitoring (Web Vitals)
Metrics are ingested via [`/api/vitals`](../app/api/vitals/route.ts):
- **LCP (Largest Contentful Paint)**: Target `< 2.5s`
- **FID / INP (First Input Delay / Interaction to Next Paint)**: Target `< 200ms`
- **CLS (Cumulative Layout Shift)**: Target `< 0.1`
- **TTFB (Time to First Byte)**: Target `< 300ms`

---

## 3. Synthetic Heartbeats & Health Checks (`/api/health`)

The health endpoint runs comprehensive system diagnostics without exposing internal connection strings:

```http
GET /api/health HTTP/1.1
Host: app.spendlens.com
```

### Response (HTTP 200 OK)
```json
{
  "status": "healthy",
  "uptimeSeconds": 18420,
  "timestamp": "2026-05-15T12:00:00.000Z",
  "version": "0.1.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "ok",
      "latencyMs": 14
    },
    "memory": {
      "status": "ok",
      "heapUsedMb": 62.4,
      "heapTotalMb": 98.2,
      "rssMb": 145.1
    }
  }
}
```

If the primary database is unreachable, the endpoint returns **HTTP 503 Service Unavailable**.

---

## 4. Alerting Rules & Escalation Matrix

| Metric | Condition | Severity | Action Channel | Runbook |
|---|---|---|---|---|
| **Synthetic Uptime** | 2 consecutive failures from 2+ regions | **P1 (Critical)** | PagerDuty, SMS | Check Edge proxy & Supabase pool |
| **5xx Error Rate** | `> 1%` over 5 minutes | **P1 (Critical)** | PagerDuty, Slack `#alerts-prod` | Inspect Sentry unhandled exceptions |
| **P95 API Latency** | `> 800ms` over 10 minutes | **P2 (High)** | Slack `#alerts-prod` | Inspect database connection pool & query plans |
| **Rate Limit Spikes** | `> 500` 429s/min from distinct IPs | **P3 (Warning)** | Slack `#sec-alerts` | Review Cloudflare WAF / rate limiting rules |
| **Memory Warning** | Heap used `> 500MB` | **P2 (High)** | Slack `#alerts-prod` | Inspect worker leak or large CSV streaming |

