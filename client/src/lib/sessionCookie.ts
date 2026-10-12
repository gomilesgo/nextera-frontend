export const PORTAL_HOME = "/portal";
export const LOGIN_PATH = "/portal/login";
export const SESSION_COOKIE_BASE = "nextera_portal_session";
export const PATH_HEADER = "x-nextera-path";

export type ExpiredReason = "session" | "blocked";

export function sessionCookieName(nodeEnv: string | undefined): string {
  return nodeEnv === "production" ? `__Host-${SESSION_COOKIE_BASE}` : SESSION_COOKIE_BASE;
}

export const SESSION_COOKIE = sessionCookieName(process.env.NODE_ENV);

export function sessionCookieOptionsFor(nodeEnv: string | undefined) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  } as const;
}

export const sessionCookieOptions = sessionCookieOptionsFor(process.env.NODE_ENV);

export function expiredPath(reason: ExpiredReason, next?: string): string {
  const params = new URLSearchParams({ expired: reason === "blocked" ? "blocked" : "1" });
  if (next && reason !== "blocked") params.set("next", next);
  return `${LOGIN_PATH}?${params.toString()}`;
}
