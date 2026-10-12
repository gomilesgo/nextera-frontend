import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { guardRequest } from "@/lib/guard";
import { sessionCookieName, sessionCookieOptions } from "@/lib/sessionCookie";

export function proxy(request: NextRequest) {
  const decision = guardRequest({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession: Boolean(request.cookies.get(sessionCookieName())?.value),
  });

  if (decision.action === "unauthorized") {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Your session has expired. Please sign in again." } },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }

  if (decision.action === "clear") {
    const response = NextResponse.next();
    response.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)",
  ],
};
