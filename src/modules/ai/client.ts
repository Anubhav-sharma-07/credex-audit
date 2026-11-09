import { SYSTEM_PROMPT, buildUserPrompt, PROMPT_VERSION } from "./prompts";
import type { AIQuestionContext, StructuredAILog } from "./types";

export interface AIClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
  apiKey?: string;
  stubModelResponse?: (ctx: AIQuestionContext) => Promise<string> | string;
}

export interface ModelCallResult {
  text: string;
  tokenCount: number;
  latencyMs: number;
  log: StructuredAILog;
}

export class AIClient {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly apiKey: string | undefined;
  private readonly stubModelResponse?: (ctx: AIQuestionContext) => Promise<string> | string;

  constructor(options: AIClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000; // 5s hard timeout
    this.maxRetries = options.maxRetries ?? 2;   // 2 retries with exponential backoff
    this.apiKey = options.apiKey ?? process.env.GROQ_API_KEY;
    this.stubModelResponse = options.stubModelResponse;
  }

  public async generateAnswer(ctx: AIQuestionContext): Promise<ModelCallResult> {
    const startTime = Date.now();
    const userPrompt = buildUserPrompt(ctx);

    // If stub is supplied (e.g. during CI testing), use it directly
    if (this.stubModelResponse) {
      const text = await this.stubModelResponse(ctx);
      const latencyMs = Date.now() - startTime;
      const tokenCount = Math.round((SYSTEM_PROMPT.length + userPrompt.length + text.length) / 4);
      return {
        text,
        tokenCount,
        latencyMs,
        log: {
          timestamp: new Date().toISOString(),
          promptVersion: PROMPT_VERSION,
          workspaceId: ctx.workspaceId,
          questionType: ctx.questionType,
          latencyMs,
          tokenCount,
          outcome: "success",
          costEstimatedUsd: 0,
        },
      };
    }

    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not configured.");
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2, // Low temperature for deterministic adherence
            max_tokens: 500,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`Model API returned status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        const tokenCount = data.usage?.total_tokens ?? Math.round((SYSTEM_PROMPT.length + userPrompt.length) / 4);
        const latencyMs = Date.now() - startTime;
        // Estimated cost: ~$0.05 per 1M tokens on llama-3.1-8b
        const costEstimatedUsd = (tokenCount / 1_000_000) * 0.05;

        return {
          text,
          tokenCount,
          latencyMs,
          log: {
            timestamp: new Date().toISOString(),
            promptVersion: PROMPT_VERSION,
            workspaceId: ctx.workspaceId,
            questionType: ctx.questionType,
            latencyMs,
            tokenCount,
            outcome: "success",
            costEstimatedUsd,
          },
        };
      } catch (err) {
        lastError = err as Error;
        attempt++;
        if (attempt <= this.maxRetries) {
          // Exponential backoff: 200ms, 400ms
          await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    throw new Error(`Model invocation failed after ${this.maxRetries} retries (${latencyMs}ms): ${lastError?.message}`);
  }
}

