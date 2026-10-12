import { describe, expect, it } from "vitest";
import { expiredPath, sessionCookieName, sessionCookieOptionsFor } from "./sessionCookie";

describe("sessionCookieName", () => {
  it("uses the __Host- prefix in production only", () => {
    expect(sessionCookieName("production")).toBe("__Host-nextera_portal_session");
    expect(sessionCookieName("development")).toBe("nextera_portal_session");
    expect(sessionCookieName(undefined)).toBe("nextera_portal_session");
  });
});

describe("sessionCookieOptions", () => {
  it("meets the __Host- requirements in production and stays host-only", () => {
    const options = sessionCookieOptionsFor("production");
    expect(options).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect("domain" in options).toBe(false);
  });

  it("drops Secure outside production so http://localhost keeps the cookie", () => {
    expect(sessionCookieOptionsFor("development").secure).toBe(false);
    expect(sessionCookieOptionsFor(undefined).secure).toBe(false);
  });
});

describe("expiredPath", () => {
  it("marks why the session ended", () => {
    expect(expiredPath("session")).toBe("/portal/login?expired=1");
    expect(expiredPath("blocked")).toBe("/portal/login?expired=blocked");
  });

  it("carries the page to return to after an expired session", () => {
    expect(expiredPath("session", "/portal/plans/steady-12?amount=1")).toBe(
      "/portal/login?expired=1&next=%2Fportal%2Fplans%2Fsteady-12%3Famount%3D1",
    );
    expect(expiredPath("blocked", "/portal")).toBe("/portal/login?expired=blocked");
  });
});
