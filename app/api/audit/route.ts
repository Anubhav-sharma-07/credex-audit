import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("audits")
      .insert({
        team_size: body.teamSize,
        use_case: body.useCase,
        total_monthly_spend: body.totalMonthlySpend,
        total_monthly_savings: body.totalMonthlySavings,
        total_annual_savings: body.totalAnnualSavings,
        tool_results: body.toolResults,
        summary: body.summary,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("Error saving audit:", error);
    return NextResponse.json({ error: "Failed to save audit" }, { status: 500 });
  }
}