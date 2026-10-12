import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { lead, leadId } from "@/test/desk";
import { anonymous, callBackend, expired, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const list = await import("./route");
const detail = await import("./[id]/route");

function listRequest(search = "") {
  return list.GET(new NextRequest(`http://admin.test/api/leads${search}`));
}

function detailRequest(id: string) {
  return detail.GET(new Request(`http://admin.test/api/leads/${id}`), { params: Promise.resolve({ id }) });
}

beforeEach(resetStaffMocks);

describe("GET /api/leads", () => {
  it("returns a page of leads without caching, for every staff role", async () => {
    for (const role of ["owner", "ops", "support"] as const) {
      signedInAs(role, () => ok({ items: [lead], nextCursor: "abc_DEF-1" }));

      const response = await listRequest();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await readJson(response)).toEqual({ items: [lead], nextCursor: "abc_DEF-1" });
    }
  });

  it("forwards validated filters and the cursor", async () => {
    signedInAs("support", () => ok({ items: [], nextCursor: null }));

    await listRequest("?status=contacted&q=%20Ravi%20&from=2026-10-01&to=2026-10-11&assigneeId=none&cursor=abc_1&limit=20&junk=1");
    expect(writes()).toEqual([
      [
        "/v1/admin/leads?status=contacted&q=Ravi&from=2026-10-01&to=2026-10-11&assigneeId=none&cursor=abc_1&limit=20",
        { token: "token-1" },
      ],
    ]);
  });

  it("rejects invalid filters before calling the backend", async () => {
    signedInAs("owner");

    for (const search of ["?status=converted_x", "?from=2026-10-12&to=2026-10-01", "?assigneeId=bob", "?cursor=a%2Fb", "?limit=500"]) {
      const response = await listRequest(search);
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await readJson(response)).toMatchObject({ error: { code: "validation" } });
    }
    expect(writes()).toEqual([]);
  });

  it("answers 401 for anonymous and expired sessions, 403 for a pending password change", async () => {
    anonymous();
    const unauthenticated = await listRequest();
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("cache-control")).toBe("no-store");
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    expect((await listRequest()).status).toBe(401);

    signedInAs("ops", undefined, { mustChangePassword: true });
    const pending = await listRequest();
    expect(pending.status).toBe(403);
    expect(await readJson(pending)).toMatchObject({ error: { code: "password_change_required" } });
    expect(writes()).toEqual([]);
  });

  it("maps backend errors and malformed payloads", async () => {
    signedInAs("ops", () => fail("forbidden", "No", 403));
    expect((await listRequest()).status).toBe(403);

    signedInAs("ops", () => ok({ items: [{ id: "x" }], nextCursor: null }));
    const malformed = await listRequest();
    expect(malformed.status).toBe(500);
    expect(await readJson(malformed)).toEqual({ error: { code: "internal", message: "Something went wrong" } });

    signedInAs("ops", () => fail("unavailable", "Could not reach the server. Please try again.", 503));
    expect((await listRequest()).status).toBe(503);
  });
});

describe("GET /api/leads/[id]", () => {
  it("returns one lead", async () => {
    signedInAs("support", () => ok({ lead }));

    const response = await detailRequest(leadId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ lead });
    expect(writes()).toEqual([[`/v1/admin/leads/${leadId}`, { token: "token-1" }]]);
  });

  it("answers 404 for a non-uuid id without calling the backend", async () => {
    signedInAs("owner");

    const response = await detailRequest("..%2Fstaff");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(writes()).toEqual([]);
  });

  it("passes a backend 404 through", async () => {
    signedInAs("owner", () => fail("not_found", "Lead not found", 404));

    const response = await detailRequest(leadId);
    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({ error: { code: "not_found", message: "Lead not found" } });
  });
});
