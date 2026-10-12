import { describe, expect, it } from "vitest";
import { sessionCookieName, sessionCookieOptions } from "./sessionCookie";

describe("session cookie", () => {
  it("uses the __Host- prefix with Secure in production", () => {
    expect(sessionCookieName("production")).toBe("__Host-nextera_admin_session");
    expect(sessionCookieOptions("production")).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });
  });

  it("uses the plain name for local development", () => {
    expect(sessionCookieName("development")).toBe("nextera_admin_session");
    expect(sessionCookieOptions("development")).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });
  });
});
