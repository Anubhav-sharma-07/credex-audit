import { type AIQuestionContext, type AIAnswerResponse, type StructuredAILog, sanitizeFinding } from "./types";
import { AIClient, type AIClientOptions } from "./client";
import { validateAIOutput } from "./post_validator";
import { generateDeterministicAnswer } from "./deterministic_fallback";
import { defaultAIRateLimiter, AIRateLimiter } from "./rate_limiter";
import { PROMPT_VERSION } from "./prompts";

export * from "./types";
export * from "./tools";
export * from "./post_validator";
export * from "./deterministic_fallback";
export * from "./rate_limiter";
export * from "./prompts";
export * from "./client";

export interface GenerateAIAnswerOptions extends AIClientOptions {
  rateLimiter?: AIRateLimiter;
  onLog?: (log: StructuredAILog) => void;
}

/**
 * Primary entry point for SpendLens AI Insight Generation.
 *
 * Enforces:
 * 1. Strict input isolation (only structured findings).
 * 2. Rate limiting and daily cost protection.
 * 3. Numerical hallucination rejection.
 * 4. Finding citation verification.
 * 5. Automatic deterministic fallback.
 * 6. Zero PII logging.
 */
export async function answerAIQuestion(
  rawCtx: AIQuestionContext,
  options: GenerateAIAnswerOptions = {}
): Promise<AIAnswerResponse> {
  const startTime = Date.now();
  const rateLimiter = options.rateLimiter ?? defaultAIRateLimiter;

  // Sanitize findings to strip prompt-injection attempts in vendor names or evidence
  const ctx: AIQuestionContext = {
    ...rawCtx,
    findings: rawCtx.findings.map(sanitizeFinding),
  };

  // 1. Enforce rate limiting & cost caps
  const rateLimitCheck = rateLimiter.checkRateLimit(ctx.userId, ctx.workspaceId);
  if (!rateLimitCheck.allowed) {
    const fallback = generateDeterministicAnswer(ctx);
    const latencyMs = Date.now() - startTime;
    const log: StructuredAILog = {
      timestamp: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      workspaceId: ctx.workspaceId,
      questionType: ctx.questionType,
      latencyMs,
      tokenCount: 0,
      outcome: "rate_limited_fallback",
      costEstimatedUsd: 0,
    };
    options.onLog?.(log);

    return {
      answer: fallback.answer,
      citedFindingIds: fallback.citedFindingIds,
      isFallback: true,
      fallbackReason: rateLimitCheck.reason,
      meta: {
        promptVersion: PROMPT_VERSION,
        latencyMs,
        tokenCount: 0,
        outcome: "error_fallback",
      },
    };
  }

  const client = new AIClient(options);

  // 2. Invoke model with timeout & retry
  try {
    const modelResult = await client.generateAnswer(ctx);

    // 3. Post-check validation: strict numeric & citation check
    const validation = validateAIOutput(modelResult.text, ctx);

    if (!validation.isValid) {
      // Rejection: hallucinated numbers or missing citations detected
      const fallback = generateDeterministicAnswer(ctx);
      const latencyMs = Date.now() - startTime;
      const log: StructuredAILog = {
        ...modelResult.log,
        outcome: "validation_fallback",
      };
      options.onLog?.(log);
      rateLimiter.recordCost(ctx.workspaceId, modelResult.log.costEstimatedUsd);

      return {
        answer: fallback.answer,
        citedFindingIds: fallback.citedFindingIds,
        isFallback: true,
        fallbackReason: validation.rejectionReason,
        meta: {
          promptVersion: PROMPT_VERSION,
          latencyMs,
          tokenCount: modelResult.tokenCount,
          outcome: "validation_fallback",
        },
      };
    }

    // Success: valid, evidence-backed answer
    options.onLog?.(modelResult.log);
    rateLimiter.recordCost(ctx.workspaceId, modelResult.log.costEstimatedUsd);

    return {
      answer: modelResult.text,
      citedFindingIds: validation.citedFindingIds,
      isFallback: false,
      meta: {
        promptVersion: PROMPT_VERSION,
        latencyMs: modelResult.latencyMs,
        tokenCount: modelResult.tokenCount,
        outcome: "success",
      },
    };
  } catch (err) {
    // Model failure / timeout: transparently fall back to deterministic text
    const fallback = generateDeterministicAnswer(ctx);
    const latencyMs = Date.now() - startTime;
    const log: StructuredAILog = {
      timestamp: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      workspaceId: ctx.workspaceId,
      questionType: ctx.questionType,
      latencyMs,
      tokenCount: 0,
      outcome: "error_fallback",
      costEstimatedUsd: 0,
    };
    options.onLog?.(log);

    return {
      answer: fallback.answer,
      citedFindingIds: fallback.citedFindingIds,
      isFallback: true,
      fallbackReason: (err as Error).message,
      meta: {
        promptVersion: PROMPT_VERSION,
        latencyMs,
        tokenCount: 0,
        outcome: "error_fallback",
      },
    };
  }
}
