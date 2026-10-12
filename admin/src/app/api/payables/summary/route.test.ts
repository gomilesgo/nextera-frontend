import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymous, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

const validSummary = {
  summary: {
    totalWalletPaise: 100000,
    pendingWithdrawals: {
      requestedPaise: 50000,
      approvedPaise: 0,
      processingPaise: 0,
      totalPaise: 50000,
    },
    returnsDue30: { grossPaise: 12000, tdsPaise: 1200, netPaise: 10800 },
    principalMaturing30Paise: 0,
    principalMaturing90Paise: 500000,
  },
};

beforeEach(resetStaffMocks);

describe("GET /api/payables/summary", () => {
  it("returns the summary without caching", async () => {
    signedInAs("owner", () => ok(validSummary));

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual(validSummary);
    expect(writes()).toEqual([["/v1/admin/payables/summary", { token: "token-1" }]]);
  });

  it("ops may also read the summary", async () => {
    signedInAs("ops", () => ok(validSummary));
    expect((await GET()).status).toBe(200);
  });

  it("refuses support and anonymous", async () => {
    anonymous();
    expect((await GET()).status).toBe(401);

    signedInAs("support");
    expect((await GET()).status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it("refuses a password-change-required session", async () => {
    signedInAs("owner", undefined, { mustChangePassword: true });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await readJson(response)).toMatchObject({ error: { code: "password_change_required" } });
    expect(writes()).toEqual([]);
  });

  it("rejects a malformed summary from the backend", async () => {
    signedInAs("owner", () => ok({ summary: { totalWalletPaise: "not-a-number" } }));
    expect((await GET()).status).toBe(500);
  });
});
