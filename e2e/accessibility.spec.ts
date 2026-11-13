import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("SpendLens Accessibility (Axe-Core Audit)", () => {
  const routes = [
    { name: "Landing", path: "/" },
    { name: "Login", path: "/login" },
    { name: "Signup", path: "/signup" },
    { name: "Public Audit", path: "/audit" },
    { name: "Demo / Overview", path: "/demo" },
    { name: "Renewals", path: "/renewals" },
    { name: "Subscriptions", path: "/subscriptions" },
    { name: "AI Insights", path: "/insights" },
    { name: "Savings", path: "/savings" },
    { name: "Admin Audit Logs", path: "/admin/audit-logs" },
    { name: "Changelog", path: "/changelog" },
  ];

  for (const route of routes) {
    test(`axe audit on ${route.name} (${route.path}) [Light Mode]`, async ({ page, baseURL }) => {
      // Set test auth cookie so workspace routes load without redirect
      const host = baseURL ? new URL(baseURL).hostname : "localhost";
      await page.context().addCookies([
        {
          name: "spendlens_e2e_auth",
          value: "e2e_authenticated_owner",
          domain: host,
          path: "/",
        },
      ]);

      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.error(
          `[AXE VIOLATION in ${route.name} - Light Mode]:`,
          JSON.stringify(
            accessibilityScanResults.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.map((n) => ({
                html: n.html,
                target: n.target,
                failureSummary: n.failureSummary,
              })),
            })),
            null,
            2
          )
        );
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test(`axe audit on ${route.name} (${route.path}) [Dark Mode]`, async ({ page, baseURL }) => {
      const host = baseURL ? new URL(baseURL).hostname : "localhost";
      await page.context().addCookies([
        {
          name: "spendlens_e2e_auth",
          value: "e2e_authenticated_owner",
          domain: host,
          path: "/",
        },
      ]);

      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      // Switch to dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
      });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.error(
          `[AXE VIOLATION in ${route.name} - Dark Mode]:`,
          JSON.stringify(
            accessibilityScanResults.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.map((n) => ({
                html: n.html,
                target: n.target,
                failureSummary: n.failureSummary,
              })),
            })),
            null,
            2
          )
        );
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
