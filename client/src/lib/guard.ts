import { LOGIN_PATH, PORTAL_HOME } from "./sessionCookie";

export type GuardDecision =
  | { action: "allow" }
  | { action: "verify" }
  | { action: "redirect"; location: string };

function isProtected(pathname: string): boolean {
  return pathname === PORTAL_HOME || pathname.startsWith(`${PORTAL_HOME}/`);
}

export function guardRequest(input: {
  pathname: string;
  search: string;
  hasSession: boolean;
}): GuardDecision {
  if (input.pathname === LOGIN_PATH || input.pathname === `${LOGIN_PATH}/`) {
    const expired = new URLSearchParams(input.search).has("expired");
    return expired && input.hasSession ? { action: "verify" } : { action: "allow" };
  }
  if (!isProtected(input.pathname) || input.hasSession) return { action: "allow" };
  const target = `${input.pathname}${input.search}`;
  if (target === PORTAL_HOME) return { action: "redirect", location: LOGIN_PATH };
  return { action: "redirect", location: `${LOGIN_PATH}?next=${encodeURIComponent(target)}` };
}
