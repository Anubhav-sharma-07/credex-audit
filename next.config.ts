import type { NextConfig } from "next";

// Patch Windows Node.js concurrent mkdir race condition using graceful-fs
if (typeof process !== "undefined" && process.platform === "win32") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gracefulFs = require("graceful-fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    gracefulFs.gracefulify(require("fs"));
  } catch {
    // graceful-fs fallback
  }
}

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
