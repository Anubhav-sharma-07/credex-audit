import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic honeypot check
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("leads")
      .insert({
        audit_id: body.auditId,
        email: body.email,
        company_name: body.companyName,
        role: body.role,
        team_size: body.teamSize,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving lead:", error);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}