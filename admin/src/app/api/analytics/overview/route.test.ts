import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { anonymous, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

const validOverview = {
  aumNowPaise: 1000000,
  aumBySeries: [{ month: "2026-10", aum: 1000000 }],
  moneyFlowByMonth: [{ month: "2026-10", moneyInPaise: 500000, moneyOutPaise: 100000 }],
  returnsByMonth: [{ month: "2026-10", grossPaise: 20000, tdsPaise: 2000, netPaise: 18000 }],
  upcomingLiabilities: {
    returns30GrossPaise: 20000,
    returns30NetPaise: 18000,
    returns90GrossPaise: 60000,
    returns90NetPaise: 54000,
    principalMaturing30Paise: 0,
    principalMaturing90Paise: 500000,
  },
  investmentsByPlan: [],
  newCustomersByMonth: [{ month: "2026-10", count: 5 }],
  leadConversionByMonth: [
    { month: "2026-10", leadsCount: 10, convertedCount: 3, conversionRateBps: 3000 },
  ],
  openQueues: {
    kycPending: 2,
    bankReviewPending: 1,
    withdrawalsRequested: 5,
    withdrawalsApproved: 3,
    withdrawalsNeedsReview: 1,
    supportOpen: 4,
    supportPendingCustomer: 2,
    paymentFlagsOpen: 0,
  },
};

function request(search = "") {
  return GET(new NextRequest(`http://admin.test/api/analytics/overview${search}`));
}

beforeEach(resetStaffMocks);

describe("GET /api/analytics/overview", () => {
  it("returns the overview without caching", async () => {
    signedInAs("owner", () => ok(validOverview));

    const response = await request("?from=2026-10&to=2026-10");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual(validOverview);
    expect(writes()).toEqual([["/v1/admin/analytics/overview?from=2026-10&to=2026-10", { token: "token-1" }]]);
  });

  it("omits params that are not provided", async () => {
    signedInAs("ops", () => ok(validOverview));
    await request();
    expect(writes()[0]?.[0]).toBe("/v1/admin/analytics/overview");
  });

  it("ops may access analytics overview", async () => {
    signedInAs("ops", () => ok(validOverview));
    const response = await request("?from=2026-10&to=2026-10");
    expect(response.status).toBe(200);
  });

  it("rejects a malformed month format (not YYYY-MM)", async () => {
    signedInAs("owner");
    expect((await request("?from=2026-1")).status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("maps auth failures", async () => {
    anonymous();
    expect((await request()).status).toBe(401);

    signedInAs("support");
    expect((await request()).status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it("refuses a password-change-required session", async () => {
    signedInAs("ops", undefined, { mustChangePassword: true });
    expect((await request()).status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it("rejects a malformed overview from the backend", async () => {
    signedInAs("owner", () => ok({ ...validOverview, aumNowPaise: "not-a-number" }));
    expect((await request()).status).toBe(500);
  });
});
