import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

export interface ValidationOptions {
  maxSizeBytes?: number; // Default 64KB for JSON
  routeContext?: string;
}

export interface ValidationSuccess<T> {
  data: T;
  requestId: string;
}

export class PayloadTooLargeError extends Error {
  constructor(message = "Request payload exceeds size limit.") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Validates and size-limits incoming request bodies.
 * Rejects unknown fields, generates request IDs, logs details server-side,
 * and returns generic, sanitized errors to clients.
 */
export async function parseAndValidateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): Promise<
  | { success: true; data: T; requestId: string }
  | { success: false; response: NextResponse; requestId: string }
> {
  const requestId = `req_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const maxSizeBytes = options.maxSizeBytes || 64 * 1024; // 64KB default
  const route = options.routeContext || "unknown_route";

  // 1. Content-Length Header Pre-check
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const parsedLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(parsedLength) && parsedLength > maxSizeBytes) {
      console.warn(`[SECURITY] [${requestId}] [${route}] Payload exceeds Content-Length limit: ${parsedLength} > ${maxSizeBytes}`);
      return {
        success: false,
        requestId,
        response: NextResponse.json(
          { error: "Payload exceeds size limit.", requestId },
          { status: 413 }
        ),
      };
    }
  }

  // 2. Stream Reading with Byte Count Guard
  let bodyText = "";
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      bodyText = await request.text();
    } else {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxSizeBytes) {
            reader.cancel();
            console.warn(`[SECURITY] [${requestId}] [${route}] Stream aborted: exceeded byte limit of ${maxSizeBytes}`);
            return {
              success: false,
              requestId,
              response: NextResponse.json(
                { error: "Payload exceeds size limit.", requestId },
                { status: 413 }
              ),
            };
          }
          chunks.push(value);
        }
      }

      const totalBuffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      bodyText = new TextDecoder().decode(totalBuffer);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Stream read error";
    console.error(`[SECURITY] [${requestId}] [${route}] Failed reading request body: ${errorMsg}`);
    return {
      success: false,
      requestId,
      response: NextResponse.json(
        { error: "Malformed request body.", requestId },
        { status: 400 }
      ),
    };
  }

  // 3. JSON Parsing Check
  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(bodyText);
  } catch {
    console.warn(`[SECURITY] [${requestId}] [${route}] Invalid JSON syntax.`);
    return {
      success: false,
      requestId,
      response: NextResponse.json(
        { error: "Invalid JSON format.", requestId },
        { status: 400 }
      ),
    };
  }

  // 4. Schema Validation with Strict Field Checking
  const strictSchema = schema instanceof z.ZodObject ? schema.strict() : schema;
  const parsed = strictSchema.safeParse(jsonBody);

  if (!parsed.success) {
    // Log exhaustive schema violations server-side
    console.warn(`[SECURITY] [${requestId}] [${route}] Schema validation failure:`, JSON.stringify(parsed.error.issues));
    
    // Return sanitized error to client
    return {
      success: false,
      requestId,
      response: NextResponse.json(
        {
          error: "Invalid request payload format.",
          requestId,
          validationIssues: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            reason: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: parsed.data as T,
    requestId,
  };
}
