import { beforeEach, describe, expect, it, vi } from "vitest";
import { member } from "@/test/fixtures";
import { anonymous, expired, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { GET } = await import("./route");

beforeEach(resetStaffMocks);

describe("GET /api/staff", () => {
  it("returns the staff list to owners without caching", async () => {
    signedInAs("owner", () => ok({ staff: [member] }));

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ staff: [member] });
    expect(writes()).toEqual([["/v1/admin/staff", { token: "token-1" }]]);
  });

  it("is closed to everyone else", async () => {
    anonymous();
    expect((await GET()).status).toBe(401);

    expired();
    expect((await GET()).status).toBe(401);

    for (const role of ["ops", "support"] as const) {
      signedInAs(role);
      const response = await GET();
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(writes()).toEqual([]);
  });

  it("refuses a list that leaks unexpected shapes", async () => {
    signedInAs("owner", () => ok({ staff: [{ ...member, role: "root" }] }));
    expect((await GET()).status).toBe(500);
  });
});
