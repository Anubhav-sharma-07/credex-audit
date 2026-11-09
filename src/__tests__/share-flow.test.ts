import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/audit/route";

const mockInsert = vi.fn().mockReturnValue({
  single: vi.fn().mockResolvedValue({ data: { id: "test-token" }, error: null }),
});
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: (...args: unknown[]) => mockCreateClient(...args),
  };
});

describe("/api/audit POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
  });

  it("fails when required fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
    const json = await resp.json();
    expect(json.error).toBeDefined();
  });

  it("succeeds with valid payload and returns token and id", async () => {
    const payload = {
      tools: [{ tool: "cursor", plan: "pro", seats: 2, monthlySpend: 100 }],
      summary: "test summary",
      teamSize: 2,
      useCase: "coding",
      totalMonthlySpend: 100,
      totalMonthlySavings: 40,
      totalAnnualSavings: 480,
    };
    const req = new NextRequest("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json.token).toBe("test-token");
    expect(json.id).toBe("test-token");
  });

  it("maps tool_results and summary fields correctly for Supabase storage", async () => {
    const toolItems = [
      {
        tool: "cursor",
        plan: "business",
        currentMonthlySpend: 80,
        recommendedAction: "downgrade_plan",
        projectedMonthlyCost: 40,
        monthlySavings: 40,
        annualSavings: 480,
        reason: "Downgrade to Pro saves $40/mo",
      },
    ];
    const payload = {
      tools: toolItems,
      summary: "Your top savings opportunity is Cursor.",
      teamSize: 2,
      useCase: "coding",
      totalMonthlySpend: 80,
      totalMonthlySavings: 40,
      totalAnnualSavings: 480,
    };
    const req = new NextRequest("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(200);

    expect(mockFrom).toHaveBeenCalledWith("audits");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        team_size: 2,
        use_case: "coding",
        total_monthly_spend: 80,
        total_monthly_savings: 40,
        total_annual_savings: 480,
        tool_results: toolItems,
        summary: "Your top savings opportunity is Cursor.",
      })
    );
  });
});