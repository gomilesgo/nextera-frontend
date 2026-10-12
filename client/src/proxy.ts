import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { callBackendFor } from "@/lib/backend/server";
import { guardRequest } from "@/lib/guard";
import { safePortalPath } from "@/lib/request";
import { PATH_HEADER, SESSION_COOKIE, sessionCookieOptions } from "@/lib/sessionCookie";
import { checkStaleSession } from "@/lib/staleSession";
import type { SessionCall } from "@/lib/staleSession";

function forward(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const decision = guardRequest({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession: Boolean(token),
  });

  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }

  if (decision.action === "verify") {
    const call: SessionCall = (path, init) => callBackendFor(request.headers, path, init);
    const verdict = await checkStaleSession(token, call);
    if (verdict === "keep") {
      const next = safePortalPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next, request.url));
    }
    if (verdict === "clear") {
      const response = forward(request);
      response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
      return response;
    }
  }

  return forward(request);
}

export const config = {
  matcher: ["/portal", "/portal/:path*"],
};
