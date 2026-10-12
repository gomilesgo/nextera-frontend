import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymous, backendCalls, context, fail, ok, resetHarness, signedInAs } from "@/test/routeHarness";

vi.mock("next/headers", async () => {
  const harness = await import("@/test/routeHarness");
  return { cookies: async () => harness.cookieStore, headers: async () => harness.incomingHeaders.current };
});

vi.mock("@/lib/backend/server", async () => {
  const harness = await import("@/test/routeHarness");
  return { callBackend: (...args: Parameters<typeof harness.callBackend>) => harness.callBackend(...args) };
});

const list = await import("./route");
const detail = await import("./[id]/route");

const entryId = "0d4c7a2e-1b3f-4e5a-8c6d-9f0a1b2c3d4e";
const staffId = "5b1f0c62-8d3e-4c1a-9f7e-2a4b6c8d0e12";

const entry = {
  id: entryId,
  actorType: "staff",
  actorId: staffId,
  actorName: "Owner",
  action: "customer.block",
  entity: "customer",
  entityId: "c1",
  ip: "203.0.113.7",
  at: "2026-10-11T06:00:00.000Z",
};

function get(path: string) {
  return new Request(`http://admin.test${path}`);
}

beforeEach(() => {
  resetHarness();
});

describe("GET /api/audit", () => {
  it("is owner only", async () => {
    for (const role of ["ops", "support"] as const) {
      signedInAs(role, () => ok({ items: [], total: 0, limit: 25, offset: 0 }));
      const response = await list.GET(get("/api/audit"));
      expect(response.status, role).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toMatchObject({ error: { code: "forbidden" } });
      expect(backendCalls()).toEqual([]);
    }
  });

  it("returns 401 to anonymous callers", async () => {
    anonymous();
    const response = await list.GET(get("/api/audit"));
    expect(response.status).toBe(401);
  });

  it("forwards the filters for owners", async () => {
    signedInAs("owner", () => ok({ items: [entry], total: 1, limit: 25, offset: 0 }));
    const response = await list.GET(
      get(`/api/audit?actorType=staff&actorId=${staffId}&action=customer.block&entity=customer&from=2026-10-01&to=2026-10-12&limit=25&offset=0`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ items: [entry], total: 1, limit: 25, offset: 0 });
    expect(backendCalls()).toEqual([
      [
        `/v1/admin/audit?actorType=staff&actorId=${staffId}&action=customer.block&entity=customer&from=2026-10-01&to=2026-10-12&offset=0&limit=25`,
        { token: "token-1" },
      ],
    ]);
  });

  it("rejects a malformed actor id and reversed dates", async () => {
    signedInAs("owner");
    const response = await list.GET(get("/api/audit?actorId=nope&from=2026-10-12&to=2026-10-01"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["actorId"]));
    expect(backendCalls()).toEqual([]);
  });
});

describe("GET /api/audit/[id]", () => {
  it("returns before and after for owners", async () => {
    const detailBody = { entry: { ...entry, before: { status: "active" }, after: { status: "blocked", reason: "Fraud check" } } };
    signedInAs("owner", () => ok(detailBody));
    const response = await detail.GET(get(`/api/audit/${entryId}`), context({ id: entryId }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(detailBody);
  });

  it("refuses ops, rejects malformed ids and maps missing entries", async () => {
    signedInAs("ops");
    expect((await detail.GET(get("/api/audit/x"), context({ id: entryId }))).status).toBe(403);

    signedInAs("owner");
    expect((await detail.GET(get("/api/audit/x"), context({ id: "x" }))).status).toBe(404);
    expect(backendCalls()).toEqual([]);

    signedInAs("owner", () => fail(404, "not_found", "Audit entry not found"));
    const missing = await detail.GET(get(`/api/audit/${entryId}`), context({ id: entryId }));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: { code: "not_found", message: "Audit entry not found" } });
  });
});
