# Architecture

## Overview
AI Spend Audit is a Next.js 16 web application that helps teams identify overspending on AI tools. Users fill out a form, get an instant audit with savings recommendations, and receive a shareable URL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Next.js API Routes (serverless functions) |
| Database | Supabase (PostgreSQL) |
| AI Summary | Groq API (Llama 3.1) |
| Deployment | Vercel |
| Testing | Vitest |
| CI/CD | GitHub Actions |

## Folder Structure
app/                      → Next.js App Router pages and API routes
src/components/           → React components
src/lib/                  → Core logic (auditEngine, pricing, supabase)
src/__tests__/            → Vitest tests
.github/workflows/        → GitHub Actions CI

## Data Flow
1. User fills form (tools, team size, use case)
2. SpendForm calls runAudit() from auditEngine.ts
3. Results sent to /api/summary → Groq generates AI summary
4. Audit saved to Supabase audits table
5. User redirected to /results/[id] (shareable URL)
6. Results page loads audit from Supabase by ID

## Database Schema
- id: UUID primary key
- team_size: INTEGER
- use_case: TEXT
- total_monthly_spend: NUMERIC
- total_monthly_savings: NUMERIC
- total_annual_savings: NUMERIC
- tool_results: JSONB
- summary: TEXT
- created_at: TIMESTAMP

## API Routes
- POST /api/summary → Generate AI summary via Groq
- POST /api/audit → Save audit results to Supabase
- POST /api/lead → Capture email leads