import { NextResponse, type NextRequest } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/modules/security/csrf";
import { getSessionUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const existingCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  const token = existingCookie || generateCsrfToken(user?.id || "anonymous").token;
  const response = NextResponse.json({ csrfToken: token });

  if (!existingCookie) {
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

