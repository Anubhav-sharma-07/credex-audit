# Prompts

## AI Summary Prompt
Used in `/api/summary/route.ts` to generate personalized audit summaries via Groq.

### Prompt
You are a financial advisor specializing in AI tool spending.
A team of {teamSize} people using AI primarily for {useCase} submitted their AI spend audit.
Their current monthly spend: ${totalMonthlySpend}
Potential monthly savings identified: ${totalMonthlySavings}
Potential annual savings: ${totalAnnualSavings}
Tools they use: {tools list with plan and monthly spend}
Write a personalized 100-word summary of their audit results. Be specific, encouraging, and actionable.
Mention their biggest savings opportunity. End with one concrete next step.
Do not use bullet points. Write in second person (you/your)
### Model
- Provider: Groq (free tier)
- Model: llama-3.1-8b-instant
- Max tokens: 1024

### Why This Prompt Works
- Sets clear role (financial advisor)
- Provides all relevant context (team size, use case, spend)
- Specifies exact output format (100 words, second person, no bullets)
- Asks for actionable output (concrete next step)
- Encourages positive tone (encouraging)

### Example Output
"Your team of 4 is spending $335/month on AI coding tools, and there's a real opportunity to optimize. Based on your usage patterns, your ChatGPT Team plan may be overkill — switching to the Plus plan could save you $60/month. Your Cursor Pro seats are well-utilized for a coding team. To move forward, cancel the ChatGPT Team plan this week and switch each developer to individual Plus accounts instead."

## Prompt Engineering Decisions

### Tone: Encouraging not alarming
Users are more likely to act on positive framing. "There's an opportunity" vs "You're wasting money."

### Format: No bullet points
Prose reads more like advice from a real advisor, less like a generic AI output.

### Length: 100 words
Short enough to read quickly, long enough to be specific and useful.

### Person: Second person (you/your)
Makes the summary feel personal and directly addressed to the user.