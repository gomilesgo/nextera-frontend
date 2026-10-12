import { describe, expect, it } from "vitest";
import { errorResponse, errorStatus, jsonNoStore, sessionFailure } from "./respond";
import type { HandlerSession } from "./respond";

const staff = {
  id: "s1",
  email: "ops@srahira.com",
  name: "Ops",
  role: "support" as const,
  mustChangePassword: false,
};

describe("errorStatus", () => {
  it("maps envelope codes to HTTP statuses", () => {
    expect(errorStatus({ code: "validation", message: "" })).toBe(400);
    expect(errorStatus({ code: "unauthorized", message: "" })).toBe(401);
    expect(errorStatus({ code: "forbidden", message: "" })).toBe(403);
    expect(errorStatus({ code: "not_found", message: "" })).toBe(404);
    expect(errorStatus({ code: "conflict", message: "" })).toBe(409);
    expect(errorStatus({ code: "account_locked", message: "" })).toBe(423);
    expect(errorStatus({ code: "rate_limited", message: "" })).toBe(429);
    expect(errorStatus({ code: "unavailable", message: "" })).toBe(503);
    expect(errorStatus({ code: "internal", message: "" })).toBe(500);
  });

  it("falls back to the upstream status for codes without a mapping", () => {
    expect(errorStatus({ code: "otp_invalid", message: "" }, 400)).toBe(400);
    expect(errorStatus({ code: "otp_invalid", message: "" })).toBe(500);
  });
});

describe("errorResponse", () => {
  it("returns the envelope with fields, retry hint and no-store", async () => {
    const response = errorResponse({
      code: "rate_limited",
      message: "Slow down",
      fields: { email: ["Bad"] },
      retryAfterSeconds: 12,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("12");
    expect(await response.json()).toEqual({
      error: { code: "rate_limited", message: "Slow down", fields: { email: ["Bad"] }, retryAfterSeconds: 12 },
    });
  });

  it("hides internal messages", async () => {
    const response = errorResponse({ code: "internal", message: "db exploded" });
    expect(await response.json()).toEqual({ error: { code: "internal", message: "Something went wrong" } });
  });
});

describe("jsonNoStore", () => {
  it("sets no-store on success payloads", async () => {
    const response = jsonNoStore({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("sessionFailure", () => {
  it("returns 401 without a usable session", () => {
    const sessions: HandlerSession[] = [{ status: "anonymous" }, { status: "expired" }];
    for (const session of sessions) expect(sessionFailure(session, "plans.view")?.status).toBe(401);
  });

  it("propagates backend outages", () => {
    const response = sessionFailure({ status: "error", error: { code: "unavailable", message: "Down" } }, null);
    expect(response?.status).toBe(503);
  });

  it("enforces role permissions and pending password changes", () => {
    const signedIn: HandlerSession = { status: "signed_in", staff, token: "t" };
    expect(sessionFailure(signedIn, "plans.view")).toBeNull();
    expect(sessionFailure(signedIn, "plans.write")?.status).toBe(403);
    const pending: HandlerSession = { ...signedIn, staff: { ...staff, mustChangePassword: true } };
    expect(sessionFailure(pending, "plans.view")?.status).toBe(403);
    expect(sessionFailure(pending, null)).toBeNull();
  });
});
