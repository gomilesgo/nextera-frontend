import { LOGIN_PATH, PORTAL_HOME } from "./sessionCookie";

type HeaderSource = { get(name: string): string | null };

const ORIGIN = "http://portal.invalid";

export function clientIp(headers: HeaderSource): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = headers.get("x-real-ip")?.trim();
  return realIp ? realIp : null;
}

function isPortalPath(pathname: string): boolean {
  return pathname === PORTAL_HOME || pathname.startsWith(`${PORTAL_HOME}/`);
}

export function safePortalPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return PORTAL_HOME;
  }
  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return PORTAL_HOME;
  }
  if (url.origin !== ORIGIN || !isPortalPath(url.pathname)) return PORTAL_HOME;
  if (url.pathname === LOGIN_PATH || url.pathname.startsWith(`${LOGIN_PATH}/`)) return PORTAL_HOME;
  return `${url.pathname}${url.search}`;
}
