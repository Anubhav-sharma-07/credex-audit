"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      route: "app-error-boundary",
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-danger-surface text-danger flex items-center justify-center mb-4">
        !
      </div>
      <h2 className="text-xl font-bold text-ink mb-2">Something went wrong</h2>
      <p className="text-sm text-ink-muted mb-4 max-w-md">
        An unexpected application error occurred. The diagnostic event has been recorded.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 bg-action-fill text-action-fill-foreground rounded-xs text-xs font-semibold hover:bg-action-fill-hover transition-standard min-h-[44px]"
      >
        Try again
      </button>
    </div>
  );
}

