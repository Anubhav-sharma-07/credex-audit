import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // 1. Desktop Chromium
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // 2. Desktop WebKit (Safari)
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // 3. Mobile Viewport (390px - iPhone 12/13/14)
    {
      name: "mobile-390px",
      use: {
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-valid-32-chars-long",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key-valid-32-chars-long",
      ENCRYPTION_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      SESSION_SECRET: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      CSRF_SECRET: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    },
  },
});

