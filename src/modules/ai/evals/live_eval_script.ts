/**
 * Live Model Evaluation Script
 *
 * Runs the fixture suite against the actual live LLM endpoint (Groq / OpenAI-compatible)
 * to verify model behavior, latency, and numerical post-check compliance in real conditions.
 *
 * Usage:
 *   GROQ_API_KEY="your-key" npx tsx src/modules/ai/evals/live_eval_script.ts
 */

import { answerAIQuestion } from "../index";
import { EVAL_FIXTURES } from "./fixtures";

async function runLiveEvals() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY environment variable is required to run live evaluations.");
    process.exit(1);
  }

  console.log(`Starting live model evaluation (${EVAL_FIXTURES.length} fixtures)...`);
  let passed = 0;
  let fallbacks = 0;

  for (const fixture of EVAL_FIXTURES) {
    const start = Date.now();
    try {
      const response = await answerAIQuestion(fixture.context, { apiKey });
      const elapsed = Date.now() - start;

      if (response.isFallback) {
        fallbacks++;
        console.log(`[FALLBACK] ${fixture.id} (${elapsed}ms) - Reason: ${response.fallbackReason}`);
      } else {
        passed++;
        console.log(`[PASSED]   ${fixture.id} (${elapsed}ms) - Cited: ${response.citedFindingIds.join(", ")}`);
      }
    } catch (err) {
      console.error(`[ERROR]    ${fixture.id} - ${(err as Error).message}`);
    }
  }

  console.log("\n--- Live Eval Summary ---");
  console.log(`Total fixtures: ${EVAL_FIXTURES.length}`);
  console.log(`Model successes: ${passed}`);
  console.log(`Deterministic fallbacks: ${fallbacks}`);
}

if (require.main === module) {
  runLiveEvals();
}

