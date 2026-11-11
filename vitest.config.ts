import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/modules/**", "src/lib/auditEngine.ts"],
      exclude: [
        "src/**/__tests__/**",
        "src/modules/**/__tests__/**",
        "src/modules/ai/evals/**",
        "src/types.ts",
        "src/modules/**/types.ts",
        "src/modules/audit/index.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        "src/modules/audit/**": {
          lines: 95,
          functions: 95,
          branches: 85,
          statements: 95,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});