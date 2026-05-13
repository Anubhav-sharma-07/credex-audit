# Reflection

## What I Built
A full-stack AI spend audit tool that helps teams find savings on AI subscriptions. Users input their tools and spending, get instant recommendations, an AI-generated summary, and a shareable URL.

## What I Learned

### Technical
- Next.js App Router requires API routes in `app/api/`, not `src/app/api/`
- Vercel auto-deploys on every `git push` to main
- Supabase RLS blocks all writes by default — must add policies explicitly
- Next.js 15+ made `params` async — use `useParams()` hook in client components
- GitHub Actions needs secrets for environment variables during build
- Groq API is a free alternative to Anthropic/OpenAI for AI summaries

### Product
- Shareable URLs dramatically increase viral potential
- Fallback text is important — never show a blank screen to users
- A simple audit form can deliver real, actionable value in under 2 minutes

### Process
- Debugging requires reading actual error logs, not guessing
- Small issues compound — fixing folder structure unlocked everything else
- Committing frequently makes it easy to track what broke and when

## Biggest Challenge
Moving API routes from `src/app/api/` to `app/api/` — took significant debugging to identify the root cause of 404 errors on Vercel.

## What I Would Do Differently
- Set up the correct folder structure from Day 1
- Add environment variable validation at startup
- Write tests before building features (TDD)

## What I'm Most Proud Of
The end-to-end flow works: form → audit engine → AI summary → Supabase → shareable URL. A user can complete an audit in 2 minutes and share results with their team instantly.

## Day 3 Specific Learnings
- Groq offers free LLM API access — great for prototypes
- GitHub Actions CI runs tests automatically on every push
- Vitest is fast and easy to set up in a Next.js project
- Shareable URLs require dynamic routing (`[id]`) and database persistence