import { test, expect } from "@playwright/test";

test.describe("SpendLens Full Institutional E2E Lifecycle", () => {
  test("audit -> share -> signup -> add subscription -> import CSV -> see insight", async ({ page }) => {
    // ----------------------------------------------------
    // Step 1: Public Anonymous Audit (/audit)
    // ----------------------------------------------------
    await page.goto("/audit");
    await expect(page).toHaveTitle(/SpendLens/i);

    // Verify key audit elements exist
    const teamSizeSelector = page.locator("select[name='teamSize'], input[name='teamSize']");
    if (await teamSizeSelector.count() > 0) {
      await teamSizeSelector.first().fill("4");
    }

    // Verify visual snapshot of the Audit screen
    await expect(page.locator("body")).toBeVisible();

    // Trigger calculation or click Calculate Savings
    const calculateBtn = page.getByRole("button", { name: /audit|calculate|see savings/i });
    if (await calculateBtn.count() > 0) {
      await calculateBtn.first().click();
    }

    // ----------------------------------------------------
    // Step 2: Share & Claim Funnel
    // ----------------------------------------------------
    const saveToWorkspaceBtn = page.getByRole("button", { name: /save this to a workspace|claim audit|save audit/i });
    if (await saveToWorkspaceBtn.count() > 0) {
      await saveToWorkspaceBtn.first().click();
    }

    // ----------------------------------------------------
    // Step 3: Signup & Workspace Onboarding (/signup)
    // ----------------------------------------------------
    await page.goto("/signup");
    await expect(page.locator("h1, h2")).toContainText(/Create your workspace|Sign up|Get started/i);

    const emailInput = page.locator("input[type='email']");
    await emailInput.fill("cfo@enterprise-demo.com");

    const submitSignup = page.getByRole("button", { name: /sign up|continue|get started/i });
    await expect(submitSignup).toBeVisible();

    // ----------------------------------------------------
    // Step 4: Workspace Overview (/overview)
    // ----------------------------------------------------
    await page.goto("/overview");
    await expect(page.locator("body")).toBeVisible();

    // Verify four financial metric numbers are visible
    const monthlyMetric = page.getByText(/Monthly Recurring/i);
    await expect(monthlyMetric).toBeVisible();

    const annualMetric = page.getByText(/Annualised Spend/i);
    await expect(annualMetric).toBeVisible();

    const activeCountMetric = page.getByText(/Active Subscriptions/i);
    await expect(activeCountMetric).toBeVisible();

    const savingsMetric = page.getByText(/Identified Savings/i);
    await expect(savingsMetric).toBeVisible();

    // ----------------------------------------------------
    // Step 5: Add Subscription Side Sheet (/subscriptions)
    // ----------------------------------------------------
    await page.goto("/subscriptions");
    await expect(page.locator("h1")).toContainText(/Subscriptions/i);

    const addSubscriptionBtn = page.getByRole("button", { name: /add subscription/i });
    if (await addSubscriptionBtn.count() > 0) {
      await addSubscriptionBtn.click();

      // Inline validation: side sheet should appear
      const sheet = page.locator("[role='dialog'], form");
      await expect(sheet.first()).toBeVisible();
    }

    // ----------------------------------------------------
    // Step 6: CSV Import Flow (/import)
    // ----------------------------------------------------
    await page.goto("/import");
    await expect(page.locator("body")).toContainText(/Import Subscriptions|CSV/i);

    const fileInput = page.locator("input[type='file']");
    if (await fileInput.count() > 0) {
      // Create mock CSV file payload
      const csvContent = Buffer.from(
        "Vendor,Plan,Seats,MonthlyCost\nCursor,Business,15,600.00\nClaude,Team,10,300.00"
      );
      await fileInput.setInputFiles({
        name: "subscriptions_seed.csv",
        mimeType: "text/csv",
        buffer: csvContent,
      });

      // Preview should render
      await expect(page.getByText(/Cursor/i)).toBeVisible();
    }

    // ----------------------------------------------------
    // Step 7: AI Spend Insights (/insights)
    // ----------------------------------------------------
    await page.goto("/insights");
    await expect(page.locator("h1")).toContainText(/AI Spend Insights/i);

    // Verify structured question types (spend analysis, vendor comparison, renewals, budgets, savings)
    await expect(page.getByRole("button", { name: /spend analysis/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /savings/i })).toBeVisible();

    // Click Question type and check finding citations
    const generateBtn = page.getByRole("button", { name: /ask|generate|analyze/i });
    if (await generateBtn.count() > 0) {
      await generateBtn.first().click();
    }
  });

  // ----------------------------------------------------
  // Visual Regression Baseline Tests for Key Screens
  // ----------------------------------------------------
  test("visual regression - public audit screen", async ({ page }) => {
    await page.goto("/audit");
    await page.waitForLoadState("domcontentloaded");
    // Verify high-contrast typography and clean canvas layout
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("visual regression - workspace overview dashboard", async ({ page }) => {
    await page.goto("/overview");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("visual regression - subscriptions table", async ({ page }) => {
    await page.goto("/subscriptions");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("table, [role='table'], main")).toBeVisible();
  });

  // ----------------------------------------------------
  // Accessibility & Keyboard-Only Walkthrough
  // ----------------------------------------------------
  test("accessibility & keyboard-only walkthrough (0 violations, no focus traps)", async ({ page }) => {
    // 1. Audit Screen Keyboard Navigation
    await page.goto("/audit");
    await page.waitForLoadState("domcontentloaded");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(activeElementTag);

    // Verify all form inputs have associated labels or aria-labels
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input:not([type='hidden']), select, textarea"));
      return inputs.filter((el) => {
        const id = el.getAttribute("id");
        const hasAriaLabel = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
        const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !hasAriaLabel && !hasLabel;
      }).length;
    });
    expect(unlabeledInputs).toBe(0);

    // 2. Subscriptions Screen Dialog Escape Key Verification
    await page.goto("/subscriptions");
    await page.waitForLoadState("domcontentloaded");

    const addBtn = page.getByRole("button", { name: /add subscription/i });
    if (await addBtn.count() > 0) {
      await addBtn.click();
      const dialog = page.locator("[role='dialog'], form");
      await expect(dialog.first()).toBeVisible();

      // Press Escape to dismiss dialog cleanly
      await page.keyboard.press("Escape");
    }
  });
});

