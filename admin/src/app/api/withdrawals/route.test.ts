import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { batch, batchDetail, batchId, withdrawal, withdrawalDetail, withdrawalId } from "@/test/withdrawals";
import { customerId } from "@/test/fixtures";
import { anonymous, callBackend, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const list = await import("./route");
const detail = await import("./[id]/route");
const batches = await import("./batches/route");
const batchDetailRoute = await import("./batches/[id]/route");

function listRequest(search = "") {
  return list.GET(new NextRequest(`http://admin.test/api/withdrawals${search}`));
}

function detailRequest(id: string) {
  return detail.GET(new Request(`http://admin.test/api/withdrawals/${id}`), { params: Promise.resolve({ id }) });
}

function batchesRequest(search = "") {
  return batches.GET(new NextRequest(`http://admin.test/api/withdrawals/batches${search}`));
}

function batchDetailRequest(id: string) {
  return batchDetailRoute.GET(new Request(`http://admin.test/api/withdrawals/batches/${id}`), { params: Promise.resolve({ id }) });
}

beforeEach(resetStaffMocks);

describe("GET /api/withdrawals", () => {
  it("returns a withdrawal list with no-store", async () => {
    signedInAs("ops", () => ok({ withdrawals: [withdrawal], nextCursor: null }));

    const response = await listRequest(`?status=requested&customerId=${customerId}&limit=50`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ withdrawals: [withdrawal], nextCursor: null });
    expect(writes()[0]?.[0]).toBe(`/v1/admin/withdrawals?status=requested&customerId=${customerId}&limit=50`);
  });

  it("rejects invalid status before calling backend", async () => {
    signedInAs("ops");
    const response = await listRequest("?status=bogus");
    expect(response.status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("rejects non-uuid customerId", async () => {
    signedInAs("ops");
    expect((await listRequest("?customerId=not-a-uuid")).status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("returns 401 when anonymous", async () => {
    anonymous();
    const r = await listRequest();
    expect(r.status).toBe(401);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("returns 403 when support", async () => {
    signedInAs("support");
    expect((await listRequest()).status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it("maps backend errors", async () => {
    signedInAs("ops", () => fail("unavailable", "down", 503));
    expect((await listRequest()).status).toBe(503);
  });

  it("returns 500 on malformed payload", async () => {
    signedInAs("ops", () => ok({ withdrawals: [{ ...withdrawal, amountPaise: "bad" }], nextCursor: null }));
    expect((await listRequest()).status).toBe(500);
  });
});

describe("GET /api/withdrawals/[id]", () => {
  it("returns withdrawal detail with no-store", async () => {
    signedInAs("owner", () => ok(withdrawalDetail));
    const response = await detailRequest(withdrawalId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(writes()[0]?.[0]).toBe(`/v1/admin/withdrawals/${withdrawalId}`);
  });

  it("returns 404 for a non-uuid id without calling backend", async () => {
    signedInAs("ops");
    expect((await detailRequest("not-a-uuid")).status).toBe(404);
    expect(writes()).toEqual([]);
  });

  it("returns 404 from backend", async () => {
    signedInAs("ops", () => fail("not_found", "not found", 404));
    expect((await detailRequest(withdrawalId)).status).toBe(404);
  });
});

describe("GET /api/withdrawals/batches", () => {
  it("returns batch list with no-store", async () => {
    signedInAs("ops", () => ok({ batches: [batch], nextCursor: null }));
    const response = await batchesRequest();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 401 when anonymous", async () => {
    anonymous();
    expect((await batchesRequest()).status).toBe(401);
  });

  it("returns 403 for support", async () => {
    signedInAs("support");
    expect((await batchesRequest()).status).toBe(403);
  });
});

describe("GET /api/withdrawals/batches/[id]", () => {
  it("returns batch detail with no-store", async () => {
    signedInAs("ops", () => ok(batchDetail));
    const response = await batchDetailRequest(batchId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 404 for non-uuid id without calling backend", async () => {
    signedInAs("ops");
    expect((await batchDetailRequest("not-a-uuid")).status).toBe(404);
    expect(writes()).toEqual([]);
  });
});
