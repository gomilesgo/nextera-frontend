import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { bankAccount } from "@/test/fixtures";
import { anonymous, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

function request(search = "") {
  return GET(new NextRequest(`http://admin.test/api/bank-accounts${search}`));
}

beforeEach(resetStaffMocks);

describe("GET /api/bank-accounts", () => {
  it("returns the review queue without caching", async () => {
    signedInAs("ops", () => ok({ items: [bankAccount] }));

    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ items: [bankAccount] });
    expect(writes()).toEqual([["/v1/admin/bank-accounts?status=review&limit=50", { token: "token-1" }]]);
  });

  it("validates the filter", async () => {
    signedInAs("owner");

    expect((await request("?status=pending")).status).toBe(400);
    expect((await request("?limit=0")).status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("maps auth failures", async () => {
    anonymous();
    expect((await request()).status).toBe(401);

    signedInAs("support");
    expect((await request()).status).toBe(403);
    expect(writes()).toEqual([]);

    signedInAs("ops", undefined, { mustChangePassword: true });
    const pending = await request();
    expect(pending.status).toBe(403);
    expect(await readJson(pending)).toMatchObject({ error: { code: "password_change_required" } });
    expect(writes()).toEqual([]);
  });

  it("refuses a malformed account list", async () => {
    signedInAs("ops", () => ok({ items: [{ ...bankAccount, status: "mystery" }] }));
    expect((await request()).status).toBe(500);
  });
});
