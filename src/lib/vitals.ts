/**
 * Client-Side Web Vitals Collector
 *
 * Sends core metrics (LCP, FID, CLS, INP, TTFB) to /api/vitals without blocking main thread.
 */

export interface WebVitalMetric {
  id: string;
  name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
}

export function reportWebVital(metric: WebVitalMetric): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...metric,
    pathname: window.location.pathname,
  });

  // Use sendBeacon if supported to avoid blocking page unloads
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/vitals", blob);
  } else {
    fetch("/api/vitals", {
      body,
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(() => {
      // Fire-and-forget; never disrupt user experience
    });
  }
}

