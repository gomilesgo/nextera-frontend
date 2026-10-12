import { isUuid } from "@/lib/shape";
import { LOGIN_PATH } from "@/lib/sessionCookie";

const documentRoute = /^\/api\/investments\/([^/]+)\/documents\/[^/]+\/?$/;

export function documentReturnPath(pathname: string): string | null {
  const match = documentRoute.exec(pathname);
  if (!match) return null;
  const id = match[1] ?? "";
  return isUuid(id) ? `/investments/${id.toLowerCase()}` : "/investments";
}

export function documentLoginPath(returnPath: string, expired: boolean): string {
  const params = new URLSearchParams();
  if (expired) params.set("expired", "1");
  params.set("next", returnPath);
  return `${LOGIN_PATH}?${params.toString()}`;
}
