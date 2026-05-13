# Reflection

## 1. The Hardest Bug

The hardest bug was API routes returning 404 on Vercel despite working locally. I initially assumed it was an environment variable issue — checked Vercel dashboard, all variables were present. Then I assumed it was a CORS problem and added headers. Still 404. I checked the Vercel function logs and noticed the routes weren't appearing as serverless functions at all — which meant Next.js wasn't recognising them.

I formed a third hypothesis: the file location was wrong. Locally, Next.js was somehow resolving routes from src/app/api/ but Vercel's build was looking at app/api/ at the root. I tested this by creating a single test route at app/api/hello/route.ts and deploying — it worked immediately. That confirmed the issue: my entire API layer was in the wrong directory.

The fix took 10 minutes once I identified the cause — moved all routes from src/app/api/ to app/api/. The lesson was to read the build output and function deployment logs first, not guess. I lost about 3 hours forming wrong hypotheses before looking at the right evidence.

## 2. A Decision I Reversed

I started with the Anthropic API for AI-generated summaries — it was the preferred option in the brief and I had credits. Midway through Day 3, the API started returning 429 errors and then billing errors. My free credits were exhausted.

I initially tried to work around it by reducing token count and caching responses. That bought an hour but the credits ran out completely. I reversed the decision entirely and switched to Groq's free tier using llama-3.1-8b-instant.

What made me reverse it was pragmatism — the summary feature needed to work on the live URL when reviewers tested it. A broken AI summary is worse than a working one from a different provider. The switch took about 90 minutes including updating the API route, changing the prompt format, and testing the output quality. Groq's response quality for a 100-word summary is comparable, and the latency is actually faster.

## 3. What I Would Build in Week 2

The most valuable week 2 addition would be a benchmark mode — "your AI spend per developer is $X, companies your size average $Y." Right now SpendLens tells you what to cut but has no external reference point. Benchmarks make the savings feel real and urgent rather than theoretical.

Second priority would be a PDF export of the full report. The shareable URL works but many finance managers and CTOs want a document they can attach to a Slack message or send to their CFO. A one-click PDF with the SpendLens branding would increase the conversion from "interesting tool" to "actually sent this to my team."

Third, I would wire up the transactional email properly with Resend — right now lead capture stores emails in Supabase but the confirmation email is not sending reliably. For Credex's lead generation purpose, that email is where the CTA to book a consultation lives, so it is critical to fix.

## 4. How I Used AI Tools

I used Cursor as my primary editor with Claude Sonnet for code generation, and ChatGPT for debugging when I wanted a second opinion. I trusted AI for boilerplate — generating the full AuditResults component structure, writing Vitest test scaffolding, and drafting GitHub Actions YAML. These are deterministic, pattern-based tasks where AI is fast and reliable.

I did not trust AI for the audit engine logic itself. The pricing rules and recommendation thresholds needed to be financially defensible — if the math is wrong, the whole product fails. I wrote that logic manually and verified every number against vendor pricing pages.

One specific time AI was wrong: I asked Cursor to generate the Supabase client initialisation and it used the legacy createClient import from @supabase/supabase-js with the old auth pattern. The code looked correct but threw a runtime error about missing auth context. I caught it by reading the Supabase v2 docs and realised the AI was trained on v1 patterns. Fixed it by following the official docs instead.

## 5. Self-Rating

**Discipline: 6/10** — I completed the project but all commits landed on 4 calendar days instead of the required 5. I underestimated how long the markdown documentation would take and left it to the final day.

**Code Quality: 7/10** — TypeScript is used throughout, abstractions are sensible, and the audit engine is cleanly separated from the UI. The main weakness is insufficient error handling in the API routes — happy path works but edge cases are not all covered.

**Design Sense: 7/10** — The UI is clean and functional using shadcn/ui and Tailwind. The results page hierarchy is clear — savings hero first, per-tool breakdown second. I would improve the mobile layout and add more visual differentiation between saving levels given more time.

**Problem Solving: 8/10** — I diagnosed and fixed several non-obvious bugs under time pressure, particularly the API route location issue and the Supabase RLS configuration. I also made a pragmatic call switching AI providers mid-build rather than blocking on a broken integration.

**Entrepreneurial Thinking: 6/10** — I built the GTM and ECONOMICS files but did not complete real user interviews before the deadline. That is the biggest gap. The audit logic is defensible but I relied on assumed user pain points rather than validated ones from actual conversations.