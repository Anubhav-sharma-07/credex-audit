# ADR-001: Technology Stack — Modular Monolith in Next.js & PostgreSQL

## Status
Accepted

## Context
SpendLens requires a high-performance, finance-grade workspace capable of executing complex deterministic audit calculations, rendering real-time tables, generating streaming AI insights, and maintaining multi-tenant isolation. We evaluated two architectures:
1. Microservices architecture with separate services for Auth, Audit Engine, Billing, and AI.
2. A Modular Monolith using Next.js (App Router), TypeScript, and PostgreSQL (Supabase).

## Decision
We chose a **Modular Monolith** built on Next.js 16, TypeScript, Tailwind CSS v4, and PostgreSQL.

### Rationale
- **Zero Inter-Service Network Latency**: In-process TypeScript function calls between domain modules (`audit`, `workspace`, `ai`, `security`) execute in microseconds, eliminating serialization overhead and distributed transaction failures.
- **Relational Integrity for Financial Accounting**: PostgreSQL enforces ACID transaction boundaries across subscriptions, price histories, and audit ledgers.
- **Unified Type Safety**: Shared domain types flow seamlessly from the database schema to server actions and TanStack table UI components without code generation lag.
- **Single Operational Footprint**: Streamlined local development, single lockfile, and automated zero-downtime deployments via Vercel and Supabase.

## Consequences
- Requires strict internal module boundaries (`src/modules/*`) and discipline to prevent circular dependencies.
- Enforced through strict linting, module encapsulation, and automated test suites.

