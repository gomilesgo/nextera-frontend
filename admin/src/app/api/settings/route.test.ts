import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymous, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

const settings = { tdsRateBps: 1000, minWithdrawalPaise: 100_000 };

beforeEach(resetStaffMocks);

describe("GET /api/settings", () => {
  it("returns the settings to owners without caching", async () => {
    signedInAs("owner", () => ok({ settings }));

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ settings });
    expect(writes()).toEqual([["/v1/admin/settings", { token: "token-1" }]]);
  });

  it("maps auth failures and backend outages", async () => {
    anonymous();
    expect((await GET()).status).toBe(401);

    signedInAs("ops");
    expect((await GET()).status).toBe(403);
    expect(writes()).toEqual([]);

    signedInAs("owner", () => fail("unavailable", "Could not reach the server", 503));
    const outage = await GET();
    expect(outage.status).toBe(503);
    expect(outage.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses out-of-range settings from the backend", async () => {
    signedInAs("owner", () => ok({ settings: { tdsRateBps: 9000, minWithdrawalPaise: 100 } }));
    expect((await GET()).status).toBe(500);
  });
});
