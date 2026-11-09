import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerUnsubscribe } from "@/modules/security/retention";
import { parseAndValidateBody } from "@/modules/security/request_validation";

const UnsubscribeSchema = z.object({
  email: z.string().email().max(255),
}).strict();

export async function POST(request: NextRequest) {
  const validation = await parseAndValidateBody(request, UnsubscribeSchema, {
    maxSizeBytes: 16 * 1024,
    routeContext: "api/unsubscribe",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;
  registerUnsubscribe(data.email);

  return NextResponse.json({
    success: true,
    email: data.email,
    message: `Email address ${data.email} has been unsubscribed from all audit communications.`,
    requestId,
  });
}

