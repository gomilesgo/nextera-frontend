import { documentLoginPath, documentReturnPath } from "./investments/documentLinks";
import { LOGIN_PATH } from "./sessionCookie";

export type GuardDecision =
  | { action: "allow" }
  | { action: "clear" }
  | { action: "unauthorized" }
  | { action: "redirect"; location: string };

export function guardRequest(input: {
  pathname: string;
  search: string;
  hasSession: boolean;
}): GuardDecision {
  if (input.pathname === LOGIN_PATH) {
    const expired = new URLSearchParams(input.search).has("expired");
    return expired && input.hasSession ? { action: "clear" } : { action: "allow" };
  }
  if (input.hasSession) return { action: "allow" };
  const documentReturn = documentReturnPath(input.pathname);
  if (documentReturn) return { action: "redirect", location: documentLoginPath(documentReturn, false) };
  if (input.pathname === "/api" || input.pathname.startsWith("/api/")) return { action: "unauthorized" };
  const target = `${input.pathname}${input.search}`;
  if (target === "/") return { action: "redirect", location: LOGIN_PATH };
  return { action: "redirect", location: `${LOGIN_PATH}?next=${encodeURIComponent(target)}` };
}
