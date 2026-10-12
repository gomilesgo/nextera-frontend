import { describe, expect, it } from "vitest";
import { guardRequest } from "./guard";

describe("guardRequest", () => {
  it("lets signed-in requests through", () => {
    expect(guardRequest({ pathname: "/plans", search: "", hasSession: true })).toEqual({ action: "allow" });
  });

  it("sends anonymous requests to login with the original target", () => {
    expect(guardRequest({ pathname: "/plans/new", search: "?a=1", hasSession: false })).toEqual({
      action: "redirect",
      location: "/login?next=%2Fplans%2Fnew%3Fa%3D1",
    });
    expect(guardRequest({ pathname: "/", search: "", hasSession: false })).toEqual({
      action: "redirect",
      location: "/login",
    });
  });

  it("always allows the login page", () => {
    expect(guardRequest({ pathname: "/login", search: "", hasSession: false })).toEqual({ action: "allow" });
    expect(guardRequest({ pathname: "/login", search: "", hasSession: true })).toEqual({ action: "allow" });
  });

  it("clears a stale cookie when login is reached after expiry", () => {
    expect(guardRequest({ pathname: "/login", search: "?expired=1", hasSession: true })).toEqual({
      action: "clear",
    });
    expect(guardRequest({ pathname: "/login", search: "?expired=1", hasSession: false })).toEqual({
      action: "allow",
    });
  });

  it("guards look-alike paths", () => {
    expect(guardRequest({ pathname: "/login-admin", search: "", hasSession: false }).action).toBe("redirect");
    expect(guardRequest({ pathname: "/login/x", search: "", hasSession: false }).action).toBe("redirect");
  });
});

describe("guardRequest for route handlers", () => {
  it("answers anonymous API calls with 401 instead of a redirect", () => {
    expect(guardRequest({ pathname: "/api/plans", search: "", hasSession: false })).toEqual({
      action: "unauthorized",
    });
    expect(guardRequest({ pathname: "/api/plans", search: "", hasSession: true })).toEqual({ action: "allow" });
    expect(guardRequest({ pathname: "/apix", search: "", hasSession: false }).action).toBe("redirect");
  });
});
