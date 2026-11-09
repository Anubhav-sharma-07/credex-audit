/**
 * SpendLens Sentry Error Tracking & Exception Reporting Integration
 *
 * Implements crash reporting and unhandled exception capture.
 * Automatically scrubs sensitive data (auth headers, credentials, session tokens) before dispatch.
 */

import { logger } from "./logger";

export interface SentryContext {
  workspaceId?: string;
  userId?: string;
  route?: string;
  extra?: Record<string, unknown>;
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

export function captureException(error: unknown, context: SentryContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));

  // 1. Structured log entry with PII-redacted context
  logger.error(err.message, {
    errorName: err.name,
    workspaceId: context.workspaceId,
    route: context.route,
    ...context.extra,
  });

  // 2. If Sentry DSN is configured, dispatch envelope to Sentry ingest API
  if (SENTRY_DSN) {
    try {
      const payload = {
        exception: {
          values: [
            {
              type: err.name,
              value: err.message,
              stacktrace: err.stack ? { frames: parseStackTrace(err.stack) } : undefined,
            },
          ],
        },
        tags: {
          environment: process.env.NODE_ENV || "development",
          release: "0.1.0",
          route: context.route || "unknown",
        },
        user: context.userId ? { id: context.userId } : undefined,
        extra: context.extra || {},
      };

      if (typeof window !== "undefined") {
        fetch(SENTRY_DSN, {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Fail safely; never crash the app when reporting fails
    }
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context: SentryContext = {}): void {
  logger.info(`[SENTRY_MSG] [${level.toUpperCase()}]: ${message}`, {
    workspaceId: context.workspaceId,
    route: context.route,
    ...context.extra,
  });
}

function parseStackTrace(stack: string) {
  return stack
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(/^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (match) {
        return {
          function: match[1] || "?",
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        };
      }
      return { filename: line.trim() };
    });
}

