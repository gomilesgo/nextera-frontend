import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { anonymous, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

const validRow = {
  customerId: "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11",
  name: "Asha Rao",
  phoneMasked: "+91XXXXXXX001",
  walletPaise: 100000,
  pendingWithdrawalPaise: 50000,
  returnsDue30: { grossPaise: 12000, tdsPaise: 1200, netPaise: 10800 },
  principalMaturing30Paise: 0,
  principalMaturing90Paise: 500000,
  totalPayablePaise: 162000,
};

function request(search = "") {
  return GET(new NextRequest(`http://admin.test/api/payables/customers${search}`));
}

beforeEach(resetStaffMocks);

describe("GET /api/payables/customers", () => {
  it("returns the first page without caching", async () => {
    signedInAs("owner", () => ok({ customers: [validRow], nextCursor: null }));

    const response = await request("?limit=50&sort=totalPayable_desc");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ customers: [validRow], nextCursor: null });
    expect(writes()).toEqual([["/v1/admin/payables/customers?limit=50&sort=totalPayable_desc", { token: "token-1" }]]);
  });

  it("forwards the cursor for subsequent pages", async () => {
    signedInAs("ops", () => ok({ customers: [], nextCursor: null }));
    await request(`?cursor=eyJpZCI6ImFiYyJ9&limit=50`);
    expect(writes()[0]?.[0]).toContain(`cursor=eyJpZCI6ImFiYyJ9`);
  });

  it("rejects an invalid sort value", async () => {
    signedInAs("owner");
    expect((await request("?sort=invalid")).status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("rejects a limit of zero", async () => {
    signedInAs("ops");
    expect((await request("?limit=0")).status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("maps auth failures", async () => {
    anonymous();
    expect((await request()).status).toBe(401);

    signedInAs("support");
    expect((await request()).status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it("rejects a malformed row from the backend", async () => {
    signedInAs("owner", () => ok({ customers: [{ ...validRow, customerId: "not-a-uuid" }], nextCursor: null }));
    expect((await request()).status).toBe(500);
  });
});
