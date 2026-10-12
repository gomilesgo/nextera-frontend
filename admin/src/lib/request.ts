import { isIP } from "node:net";

type HeaderSource = { get(name: string): string | null };

function validIp(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && isIP(trimmed) !== 0 ? trimmed : null;
}

export function clientIp(headers: HeaderSource): string | null {
  return validIp(headers.get("x-forwarded-for")?.split(",")[0]) ?? validIp(headers.get("x-real-ip") ?? undefined);
}

const SENTINEL_ORIGIN = "http://n";
const controlChars = /[\u0000-\u001F\u007F]/;

function hasControlChars(value: string): boolean {
  if (controlChars.test(value)) return true;
  try {
    return controlChars.test(decodeURIComponent(value));
  } catch {
    return true;
  }
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.includes("\\") || hasControlChars(value)) return "/";
  let url: URL;
  try {
    url = new URL(value, SENTINEL_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== SENTINEL_ORIGIN) return "/";
  const path = `${url.pathname}${url.search}`;
  if (path.startsWith("//") || url.pathname === "/login" || url.pathname.startsWith("/login/")) return "/";
  return path;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
