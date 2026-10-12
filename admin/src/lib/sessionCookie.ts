export const BASE_SESSION_COOKIE = "nextera_admin_session";
export const LOGIN_PATH = "/login";
export const EXPIRED_PATH = "/login?expired=1";
export const PASSWORD_PATH = "/account/password";

type NodeEnv = string | undefined;

export function sessionCookieName(nodeEnv: NodeEnv = process.env.NODE_ENV): string {
  return nodeEnv === "production" ? `__Host-${BASE_SESSION_COOKIE}` : BASE_SESSION_COOKIE;
}

export function sessionCookieOptions(nodeEnv: NodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "strict",
    path: "/",
  } as const;
}
