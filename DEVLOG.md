## Day 1 — 2026-05-10

**Hours worked:** 4

**What I did:**
Set up the Next.js + TypeScript project from scratch. Installed shadcn/ui, Supabase, and Resend packages. Created the core type definitions for all AI tools and plans. Built the pricing constants file with data from official vendor pages. Wrote the audit engine with per-tool logic and cross-tool consolidation detection. Built the SpendForm component with localStorage persistence. Wired everything together in the main page and confirmed the audit engine returns correct results in the browser.

**What I learned:**
How Next.js App Router works. How TypeScript path aliases work with tsconfig.json. That the audit logic needs to be purely rule-based with no AI to be financially defensible. How to debug module resolution errors in Next.js.

**Blockers / what I'm stuck on:**
Had issues with tsconfig paths not resolving correctly — fixed by ensuring all files are inside src/ and the alias points to ./src/*. Some red underlines still showing in Cursor editor but app runs fine.

**Plan for tomorrow:**
Build the full audit results page with per-tool breakdown and savings numbers. Add Anthropic API for the AI-generated summary paragraph. Set up Supabase to store audit results. Build the shareable URL feature.


## Day 2 — 2026-05-11

**Hours worked:** 6

**What I did:**
Built the full AuditResults component with per-tool breakdown, savings hero, and AI summary. Set up Supabase database with audits and leads tables. Created API routes for saving audits, generating AI summaries using Anthropic API, and capturing leads. Built the LeadCapture form component. Deployed the app to Vercel — it is now live at https://credex-audit-eight.vercel.app

**What I learned:**
How to connect Next.js API routes to Supabase. How to call the Anthropic API from a server route. How to deploy to Vercel with environment variables.

**Blockers / what I'm stuck on:**
AuditResults component had repeated paste errors — fixed by using Cursor AI to generate the component. TypeScript error in summary route catch block — fixed by removing body reference from catch scope.

**Plan for tomorrow:**
Add shareable URLs for each audit. Write all required markdown files. Set up GitHub Actions CI. Do user interviews.


## Day 3 — 2026-05-12

**Hours worked:** 7

**What I did:**
Fixed AI summary API route on Vercel (routes were in src/app/api/ but Next.js was looking in app/api/). Added shareable URLs — audit results now saved to Supabase and redirected to /results/[id]. Built results page at app/results/[id]/page.tsx with spend breakdown, AI summary, and copy link button. Fixed Supabase RLS policies to allow public insert and select. Fixed missing columns in audits table.

**What I learned:**
Next.js 15 App Router requires API routes at the root app/ level, not inside src/. Supabase RLS policies must be explicitly set for public-facing inserts. The useParams() hook is required for dynamic routes in Next.js 15 — params.id alone returns undefined.

**Blockers / what I'm stuck on:**
Anthropic API ran out of free credits mid-build. Had to pivot to Groq free tier. This cost about 2 hours of debugging and switching provider logic.

**Plan for tomorrow:**
Write all 10 required markdown files. Add 5 Vitest tests for the audit engine. Set up GitHub Actions CI. Finalize the UI polish and OG tags for shareable URLs.


## Day 4 — 2026-05-13

**Hours worked:** 8

**What I did:**
Switched AI provider from Anthropic to Groq (llama-3.1-8b-instant) for AI summaries. Wrote 5 Vitest tests for auditEngine — all passing locally and in CI. Set up GitHub Actions CI — runs lint and tests on every push to main, currently green. Wrote all 10 required markdown documentation files: ARCHITECTURE, REFLECTION, TESTS, GTM, ECONOMICS, PRICING_DATA, PROMPTS, LANDING_COPY, METRICS, DEVLOG. Rebranded app to SpendLens. Fixed page title, meta tags, and favicon.

**What I learned:**
Groq offers a genuinely fast and free LLM API — better choice than Anthropic for a prototype with uncertain credit availability. GitHub Actions with pnpm requires explicit cache configuration. Writing the GTM and ECONOMICS files forced me to think about the product as a business, not just a coding exercise — that shift in thinking was valuable.

**Blockers / what I'm stuck on:**
The ARCHITECHT URE.md filename got corrupted with a space during creation — spent time debugging git mv failures. Resolved by creating a fresh ARCHITECTURE.md. CI workflow had a secret injection issue on first run — fixed by triggering a fresh push.

**Plan for tomorrow:**
N/A — this is the final submission day. Will do a full end-to-end test of the live app, verify CI is green, and submit the Google Form.


## Day 5 — 2026-05-13

**Hours worked:** 0

**What I did:**
No new feature work today — this was submission day. Focused entirely on final checks: verifying the live URL works end-to-end, confirming CI is green on GitHub Actions, and submitting the Google Form before the deadline.

**What I learned:**
Shipping under a hard deadline forces ruthless prioritisation. The features I didn't build (PDF export, embeddable widget, referral codes) were the right things to cut — the core audit flow works and that matters more than bonus features.

**Blockers / what I'm stuck on:**
None — app is live and functional.

**Plan for tomorrow:**
Wait for Round 2 results. If shortlisted, plan the focused 2-day build.