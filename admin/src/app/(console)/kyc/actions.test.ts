import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  anonymous,
  callBackend,
  expired,
  fail,
  ok,
  redirectTarget,
  resetStaffMocks,
  signedInAs,
  writes,
} from "@/test/staff";
import { customerId } from "@/test/fixtures";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { approveKyc, rejectKyc } = await import("./actions");

const reviewed = { kycStatus: "verified", profile: null };

beforeEach(resetStaffMocks);

describe("KYC server actions", () => {
  it("refuses support staff without calling the backend", async () => {
    signedInAs("support");

    await expect(approveKyc(customerId)).resolves.toEqual({
      status: "error",
      code: "forbidden",
      message: "Your role does not allow this action",
    });
    await expect(rejectKyc(customerId, "Name does not match")).resolves.toMatchObject({ status: "error" });
    expect(writes()).toEqual([]);
  });

  it("lets ops approve with the bearer token", async () => {
    signedInAs("ops", () => ok(reviewed));

    await expect(approveKyc(customerId)).resolves.toEqual({ status: "ok", data: reviewed });
    expect(writes()).toEqual([[`/v1/admin/customers/${customerId}/kyc/approve`, { method: "POST", token: "token-1" }]]);
  });

  it("sends a trimmed reason when rejecting", async () => {
    signedInAs("owner", () => ok({ kycStatus: "rejected", profile: null }));

    await expect(rejectKyc(customerId, "  PAN name differs  ")).resolves.toMatchObject({ status: "ok" });
    expect(writes()).toEqual([
      [
        `/v1/admin/customers/${customerId}/kyc/reject`,
        { method: "POST", token: "token-1", json: { reason: "PAN name differs" } },
      ],
    ]);
  });

  it("requires a reason before calling the backend", async () => {
    signedInAs("owner");

    const result = await rejectKyc(customerId, " x ");
    expect(result).toMatchObject({ status: "error", code: "validation", errors: { reason: [expect.any(String)] } });
    await expect(rejectKyc(customerId, "y".repeat(501))).resolves.toMatchObject({ status: "error" });
    expect(writes()).toEqual([]);
  });

  it("rejects malformed customer ids before calling the backend", async () => {
    signedInAs("owner");

    await expect(approveKyc("../staff")).resolves.toEqual({
      status: "error",
      code: "not_found",
      message: "Customer not found",
    });
    expect(writes()).toEqual([]);
  });

  it("passes backend conflicts through", async () => {
    signedInAs("ops", () => fail("conflict", "Only submitted KYC can be reviewed", 409));

    await expect(approveKyc(customerId)).resolves.toEqual({
      status: "error",
      code: "conflict",
      message: "Only submitted KYC can be reviewed",
    });
  });

  it("refuses an unexpected backend response", async () => {
    signedInAs("ops", () => ok({ nope: true }));

    await expect(approveKyc(customerId)).resolves.toMatchObject({ status: "error", code: "internal" });
  });

  it("redirects anonymous, expired and pending-password sessions", async () => {
    anonymous();
    expect(await redirectTarget(approveKyc(customerId))).toBe("/login");
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    expect(await redirectTarget(rejectKyc(customerId, "Bad scan"))).toBe("/login?expired=1");

    signedInAs("owner", undefined, { mustChangePassword: true });
    expect(await redirectTarget(approveKyc(customerId))).toBe("/account/password");
    expect(writes()).toEqual([]);
  });
});
