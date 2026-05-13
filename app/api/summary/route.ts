import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const prompt = `You are a financial advisor specializing in AI tool spending.

A team of ${body.teamSize} people using AI primarily for ${body.useCase} submitted their AI spend audit.

Their current monthly spend: $${body.totalMonthlySpend}
Potential monthly savings identified: $${body.totalMonthlySavings}
Potential annual savings: $${body.totalAnnualSavings}

Tools they use: ${body.tools.map((t: any) => `${t.tool} (${t.plan} plan, $${t.currentMonthlySpend}/mo)`).join(", ")}

Write a personalized 100-word summary of their audit results. Be specific, encouraging, and actionable.
Mention their biggest savings opportunity. End with one concrete next step.
Do not use bullet points. Write in second person (you/your).`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary.";

    return NextResponse.json({ summary });

  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json({
      summary: "Your AI spend audit is complete. Review the per-tool breakdown above for specific recommendations. The biggest opportunity is optimizing your plan selection based on your team size and actual usage patterns.",
    });
  }
}