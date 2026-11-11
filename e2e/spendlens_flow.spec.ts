import { test, expect } from "@playwright/test";

test.describe("SpendLens Security, CSP & Hydration Verification", () => {
  // ========================================================
  // BUG 1 VERIFICATION: Strict CSP & Full Client Hydration
  // ========================================================
  test("audit page loads with strict CSP, zero console CSP errors, and hydrates interactive tool chips", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const cspViolations: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        msg.type() === "error" ||
        text.toLowerCase().includes("content security policy") ||
        text.toLowerCase().includes("violates the following")
      ) {
        if (text.toLowerCase().includes("content security policy") || text.toLowerCase().includes("violates")) {
          cspViolations.push(text);
        } else {
          consoleErrors.push(text);
        }
      }
    });

    // 1. Load /audit in production mode
    const response = await page.goto("/audit");
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("domcontentloaded");

    // 2. Verify CSP headers on response
    const headers = response?.headers() || {};
    const csp = headers["content-security-policy"] || "";
    expect(csp).toContain("script-src");
    expect(csp).toContain("strict-dynamic");
    expect(headers["x-nonce"]).toBeDefined();

    // 3. Assert ZERO CSP violations logged to console
    expect(cspViolations).toEqual([]);

    // 4. Prove Client Hydration: Click tool chip and verify form state updates
    const cursorChip = page.getByRole("button", { name: "Cursor", exact: true });
    await expect(cursorChip).toBeVisible();
    await expect(cursorChip).toHaveAttribute("aria-pressed", "false");

    // Click the tool chip
    await cursorChip.click();

    // Verify aria-pressed toggles to true (proves React event listener was executed)
    await expect(cursorChip).toHaveAttribute("aria-pressed", "true");

    // Verify the Plan & Actual Monthly Spend Details section appears
    const detailsSection = page.getByText("3. Plan & Actual Monthly Spend Details");
    await expect(detailsSection).toBeVisible();

    // Toggle off
    await cursorChip.click();
    await expect(cursorChip).toHaveAttribute("aria-pressed", "false");

    // Final assertion: Still ZERO CSP violations
    expect(cspViolations).toHaveLength(0);
  });

  // ========================================================
  // BUG 2 VERIFICATION: Real Supabase Auth & Anti-Bypass
  // ========================================================
  test("unauthenticated access to /overview rejects made-up cookie (spendlens_session=x) and redirects to /login", async ({
    context,
    page,
  }) => {
    // Attempt to bypass authentication with an arbitrary cookie
    await context.addCookies([
      {
        name: "spendlens_session",
        value: "x",
        url: "http://localhost:3000",
      },
      {
        name: "sb-fake-auth-token",
        value: "malicious_payload",
        url: "http://localhost:3000",
      },
    ]);

    // Navigate to protected workspace
    await page.goto("/overview");

    // Must be redirected to /login because Supabase session is invalid/unverified
    await expect(page).toHaveURL(/\/login(\?redirect=.*)?/);
    await expect(page.locator("h1")).toContainText(/Sign in/i);
  });

  test("demo workspace (/demo) is an independent read-only route with sample data", async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL("/demo");

    // 1. Verify prominent Demo Mode banner
    await expect(page.getByText("Demo Mode (Read-Only)")).toBeVisible();
    await expect(page.getByText("Acme Engineering (Demo)")).toBeVisible();

    // 2. Verify financial metrics
    await expect(page.getByText("$3,720.00")).toBeVisible();
    await expect(page.getByText("+$1,180.00")).toBeVisible();

    // 3. Verify sample subscriptions table
    await expect(page.getByRole("cell", { name: "Cursor" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "GitHub Copilot" })).toBeVisible();

    // 4. Verify mutation actions are disabled
    const addBtn = page.getByRole("button", { name: /Add Subscription/i });
    await expect(addBtn).toBeDisabled();
  });
});

test.describe("SpendLens End-to-End User Funnel", () => {
  test("audit -> share -> signup -> demo evaluation", async ({ page }) => {
    // ----------------------------------------------------
    // Step 1: Public Anonymous Audit (/audit)
    // ----------------------------------------------------
    await page.goto("/audit");
    await expect(page).toHaveTitle(/SpendLens/i);

    const teamSizeInput = page.locator("#team-size-input");
    await expect(teamSizeInput).toBeVisible();
    await teamSizeInput.fill("6");

    // Select Cursor and Claude
    const cursorChip = page.getByRole("button", { name: "Cursor", exact: true });
    await cursorChip.click();
    await expect(cursorChip).toHaveAttribute("aria-pressed", "true");

    const claudeChip = page.getByRole("button", { name: "Claude (Anthropic)", exact: true });
    await claudeChip.click();
    await expect(claudeChip).toHaveAttribute("aria-pressed", "true");

    // ----------------------------------------------------
    // Step 2: Signup Screen Navigation (/signup)
    // ----------------------------------------------------
    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText(/Create your.*workspace|Sign up/i);

    // ----------------------------------------------------
    // Step 3: Login Screen with Live Demo Link (/login)
    // ----------------------------------------------------
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/Sign in/i);

    const demoLink = page.getByRole("link", { name: /Explore Live Demo/i });
    await expect(demoLink).toBeVisible();
    await demoLink.click();

    // Arrives at /demo
    await expect(page).toHaveURL("/demo");
    await expect(page.getByText("Demo Mode (Read-Only)")).toBeVisible();
  });
});
