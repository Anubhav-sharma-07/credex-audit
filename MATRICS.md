# Metrics

## North Star Metric
**Number of audits completed per week**
This captures both acquisition and activation in one number.

## Acquisition Metrics
| Metric | Target | How to Measure |
|--------|--------|---------------|
| Weekly visitors | 500 | Vercel Analytics |
| Audit start rate | 60% | Form impressions vs submissions |
| Audit completion rate | 80% | Form starts vs completions |
| Weekly audits completed | 100 | Supabase audits table count |

## Activation Metrics
| Metric | Target | How to Measure |
|--------|--------|---------------|
| AI summary load time | < 3s | Vercel function logs |
| Results page load time | < 1s | Vercel Analytics |
| Share button click rate | 30% | Click tracking |

## Retention Metrics
| Metric | Target | How to Measure |
|--------|--------|---------------|
| Return visitors | 20% | Vercel Analytics |
| Re-audit rate (30 days) | 15% | Supabase repeat user tracking |

## Revenue Metrics
| Metric | Target | How to Measure |
|--------|--------|---------------|
| Email capture rate | 10% | Supabase leads table |
| Free to Pro conversion | 5% | Stripe dashboard |
| Monthly Recurring Revenue | $450 | Stripe dashboard |
| Churn rate | < 5% | Stripe dashboard |

## Viral Metrics
| Metric | Target | How to Measure |
|--------|--------|---------------|
| Share rate | 30% | Share button clicks / audits |
| Viral coefficient | > 0.5 | New users from shared links |
| Shared link click rate | 40% | Supabase results page visits |

## Technical Metrics
| Metric | Target | How to Measure |
|--------|--------|---------------|
| API uptime | 99.9% | Vercel status |
| CI pass rate | 100% | GitHub Actions |
| Test coverage | 80% | Vitest coverage report |
| Build time | < 2 min | Vercel build logs |

## Current Baseline (Day 3)
- Audits completed: ~10 (testing)
- AI summary success rate: 95%
- Test pass rate: 100% (5/5)
- CI status: ✅ Green
- Shareable URLs: ✅ Working

## How to Track
1. Supabase dashboard → count rows in `audits` table
2. Vercel Analytics → enable in project settings
3. GitHub Actions → check workflow runs
4. Console logs → Vercel function logs