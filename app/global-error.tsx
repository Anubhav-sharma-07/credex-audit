"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      route: "global-error-boundary",
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-canvas text-ink antialiased">
        <div className="w-12 h-12 rounded-full bg-danger-surface text-danger flex items-center justify-center text-lg font-bold mb-4">
          !
        </div>
        <h2 className="text-xl font-bold mb-2">Critical Application Error</h2>
        <p className="text-sm text-ink-muted mb-6 max-w-md">
          A critical system error occurred. The incident was captured for engineering review.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2.5 bg-action-fill text-action-fill-foreground rounded-xs text-xs font-semibold hover:bg-action-fill-hover transition-standard min-h-[44px]"
        >
          Reload application
        </button>
      </body>
    </html>
  );
}

