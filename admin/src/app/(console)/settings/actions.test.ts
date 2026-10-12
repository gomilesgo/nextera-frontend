import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackendRequest } from "@/lib/backend/client";
import { fail, ok, redirectTarget, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { updateSettings } = await import("./actions");

const current = { tdsRateBps: 1000, minWithdrawalPaise: 100_000 };

function form(tdsRate: string, minWithdrawal: string) {
  const data = new FormData();
  data.set("tdsRate", tdsRate);
  data.set("minWithdrawal", minWithdrawal);
  return data;
}

function backend(patch: (init?: BackendRequest) => ReturnType<typeof ok> | ReturnType<typeof fail>) {
  return (path: string, init?: BackendRequest) => {
    if (path !== "/v1/admin/settings") return undefined;
    return init?.method === "PATCH" ? patch(init) : ok({ settings: current });
  };
}

function patches() {
  return writes().filter(([, init]) => init?.method === "PATCH");
}

beforeEach(resetStaffMocks);

describe("updateSettings", () => {
  it("is owner only", async () => {
    for (const role of ["ops", "support"] as const) {
      signedInAs(role);
      await expect(updateSettings(form("10", "1000"))).resolves.toMatchObject({ status: "error", code: "forbidden" });
    }
    expect(writes()).toEqual([]);
  });

  it("sends only the changed keys, converted to basis points and paise", async () => {
    signedInAs("owner", backend((init) => ok({ settings: { ...current, ...(init?.json as object) } })));

    await expect(updateSettings(form("10.5", "1,000"))).resolves.toEqual({
      status: "ok",
      data: { settings: { ...current, tdsRateBps: 1050 }, changed: true },
    });
    expect(patches()).toEqual([
      ["/v1/admin/settings", { method: "PATCH", token: "token-1", json: { tdsRateBps: 1050 } }],
    ]);
  });

  it("skips the write when nothing changed", async () => {
    signedInAs("owner", backend(() => ok({ settings: current })));

    await expect(updateSettings(form("10", "1000.00"))).resolves.toEqual({
      status: "ok",
      data: { settings: current, changed: false },
    });
    expect(patches()).toEqual([]);
  });

  it("validates against the contracts schema before writing", async () => {
    signedInAs("owner", backend(() => ok({ settings: current })));

    await expect(updateSettings(form("51", "0.5"))).resolves.toMatchObject({
      status: "error",
      code: "validation",
      errors: { tdsRate: ["TDS cannot exceed 50%"], minWithdrawal: ["Minimum withdrawal must be at least ₹1"] },
    });
    await expect(updateSettings(form("abc", "9".repeat(20)))).resolves.toMatchObject({
      errors: { tdsRate: [expect.any(String)], minWithdrawal: ["Amount is too large"] },
    });
    expect(patches()).toEqual([]);
  });

  it("maps backend field errors back to the form", async () => {
    signedInAs("owner", backend(() => fail("validation", "Invalid", 400, { tdsRateBps: ["Too high"] })));

    await expect(updateSettings(form("12", "1000"))).resolves.toEqual({
      status: "error",
      code: "validation",
      message: "Please check the highlighted fields.",
      errors: { tdsRate: ["Too high"] },
    });
  });

  it("stops when the current settings cannot be read", async () => {
    signedInAs("owner", () => fail("unavailable", "Could not reach the server", 503));

    await expect(updateSettings(form("12", "1000"))).resolves.toMatchObject({ status: "error", code: "unavailable" });
    expect(patches()).toEqual([]);
  });

  it("sends staff with a pending password change away", async () => {
    signedInAs("owner", undefined, { mustChangePassword: true });
    expect(await redirectTarget(updateSettings(form("10", "1000")))).toBe("/account/password");
    expect(writes()).toEqual([]);
  });
});
