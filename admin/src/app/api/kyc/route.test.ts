import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { customerId, customerKyc, queueItem } from "@/test/fixtures";
import { anonymous, callBackend, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const queue = await import("./route");
const detail = await import("./[customerId]/route");

function queueRequest(search = "") {
  return queue.GET(new NextRequest(`http://admin.test/api/kyc${search}`));
}

function detailRequest(id: string) {
  return detail.GET(new Request(`http://admin.test/api/kyc/${id}`), {
    params: Promise.resolve({ customerId: id }),
  });
}

beforeEach(resetStaffMocks);

describe("GET /api/kyc", () => {
  it("returns the queue without caching", async () => {
    signedInAs("ops", () => ok({ items: [queueItem] }));

    const response = await queueRequest("?status=rejected&limit=100");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ items: [queueItem] });
    expect(writes()).toEqual([["/v1/admin/kyc?status=rejected&limit=100", { token: "token-1" }]]);
  });

  it("defaults to the submitted queue", async () => {
    signedInAs("owner", () => ok({ items: [] }));

    await queueRequest();
    expect(writes()[0]?.[0]).toBe("/v1/admin/kyc?status=submitted&limit=50");
  });

  it("rejects an invalid filter before calling the backend", async () => {
    signedInAs("owner");

    const response = await queueRequest("?status=bogus&limit=900");
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toMatchObject({ error: { code: "validation" } });
    expect(writes()).toEqual([]);
  });

  it("maps a missing session to 401 and support to 403", async () => {
    anonymous();
    const unauthenticated = await queueRequest();
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("cache-control")).toBe("no-store");
    expect(callBackend).not.toHaveBeenCalled();

    signedInAs("support");
    const forbidden = await queueRequest();
    expect(forbidden.status).toBe(403);
    expect(await readJson(forbidden)).toMatchObject({ error: { code: "forbidden" } });
    expect(writes()).toEqual([]);
  });

  it("maps backend errors and malformed payloads", async () => {
    signedInAs("ops", () => fail("unauthorized", "expired", 401));
    expect((await queueRequest()).status).toBe(401);

    signedInAs("ops", () => ok({ items: [{ customerId: "x" }] }));
    const malformed = await queueRequest();
    expect(malformed.status).toBe(500);
    expect(await readJson(malformed)).toEqual({ error: { code: "internal", message: "Something went wrong" } });
  });
});

describe("GET /api/kyc/[customerId]", () => {
  it("returns one customer's KYC", async () => {
    signedInAs("owner", () => ok(customerKyc));

    const response = await detailRequest(customerId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual(customerKyc);
    expect(writes()).toEqual([[`/v1/admin/customers/${customerId}/kyc`, { token: "token-1" }]]);
  });

  it("answers 404 for a non-uuid id without calling the backend", async () => {
    signedInAs("owner");

    const response = await detailRequest("..%2Fstaff");
    expect(response.status).toBe(404);
    expect(writes()).toEqual([]);
  });

  it("allows all staff roles including support", async () => {
    for (const role of ["owner", "ops", "support"] as const) {
      resetStaffMocks();
      signedInAs(role, () => ok(customerKyc));
      const response = await detailRequest(customerId);
      expect(response.status).toBe(200);
      expect(await readJson(response)).toEqual(customerKyc);
    }
  });

  it("answers 401 without a session", async () => {
    anonymous();
    expect((await detailRequest(customerId)).status).toBe(401);
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("maps backend errors", async () => {
    signedInAs("support", () => fail("not_found", "KYC not found", 404));
    expect((await detailRequest(customerId)).status).toBe(404);
  });
});
