import { describe, expect, it } from "vitest";
import { guardRequest } from "./guard";

describe("guardRequest", () => {
  it("lets requests with a session cookie through", () => {
    expect(guardRequest({ pathname: "/portal/plans", search: "", hasSession: true })).toEqual({ action: "allow" });
  });

  it("sends anonymous portal requests to login with the original target", () => {
    expect(guardRequest({ pathname: "/portal/plans/gold", search: "?amount=1", hasSession: false })).toEqual({
      action: "redirect",
      location: "/portal/login?next=%2Fportal%2Fplans%2Fgold%3Famount%3D1",
    });
    expect(guardRequest({ pathname: "/portal", search: "", hasSession: false })).toEqual({
      action: "redirect",
      location: "/portal/login",
    });
  });

  it("never guards public pages", () => {
    expect(guardRequest({ pathname: "/", search: "", hasSession: false })).toEqual({ action: "allow" });
    expect(guardRequest({ pathname: "/enquire", search: "", hasSession: false })).toEqual({ action: "allow" });
    expect(guardRequest({ pathname: "/portalx", search: "", hasSession: false })).toEqual({ action: "allow" });
  });

  it("always allows the login page", () => {
    expect(guardRequest({ pathname: "/portal/login", search: "", hasSession: false })).toEqual({ action: "allow" });
    expect(guardRequest({ pathname: "/portal/login", search: "", hasSession: true })).toEqual({ action: "allow" });
  });

  it("asks the proxy to verify the cookie when login is reached after expiry", () => {
    expect(guardRequest({ pathname: "/portal/login", search: "?expired=1", hasSession: true })).toEqual({
      action: "verify",
    });
    expect(guardRequest({ pathname: "/portal/login", search: "?expired=blocked", hasSession: true })).toEqual({
      action: "verify",
    });
    expect(guardRequest({ pathname: "/portal/login", search: "?expired=1", hasSession: false })).toEqual({
      action: "allow",
    });
  });
});
