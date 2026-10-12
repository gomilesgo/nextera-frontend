import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymous, expired, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

const assignable = [
  { id: "1e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f61", name: "Ops", role: "ops" },
  { id: "2e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f62", name: "Support", role: "support" },
];

beforeEach(resetStaffMocks);

describe("GET /api/staff/assignable", () => {
  it("returns assignable staff to all roles with no-store", async () => {
    for (const role of ["owner", "ops", "support"] as const) {
      resetStaffMocks();
      signedInAs(role, () => ok({ staff: assignable }));
      const response = await GET();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await readJson(response)).toEqual({ staff: assignable });
      expect(writes()).toEqual([["/v1/admin/staff/assignable", { token: "token-1" }]]);
    }
  });

  it("returns an empty list gracefully", async () => {
    signedInAs("support", () => ok({ staff: [] }));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ staff: [] });
  });

  it("is closed to anonymous and expired callers", async () => {
    anonymous();
    expect((await GET()).status).toBe(401);

    expired();
    expect((await GET()).status).toBe(401);
    expect(writes()).toEqual([]);
  });

  it("refuses a response with unexpected shapes", async () => {
    signedInAs("owner", () => ok({ staff: [{ id: "not-a-uuid", name: "Bad" }] }));
    expect((await GET()).status).toBe(500);
  });

  it("maps backend errors", async () => {
    signedInAs("ops", () => fail("internal", "unexpected error", 500));
    expect((await GET()).status).toBe(500);
  });
});
