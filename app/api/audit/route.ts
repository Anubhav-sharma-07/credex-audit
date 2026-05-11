import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("audits")
      .insert({
        tools: body.tools,
        total_monthly_spend: body.totalMonthlySpend,
        total_monthly_savings: body.totalMonthlySavings,
        total_annual_savings: body.totalAnnualSavings,
        use_case: body.useCase,
        team_size: body.teamSize,
        ai_summary: body.aiSummary,
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