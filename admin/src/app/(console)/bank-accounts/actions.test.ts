import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountId, bankAccount } from "@/test/fixtures";
import { expired, fail, ok, redirectTarget, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { approveBankAccount, rejectBankAccount } = await import("./actions");

beforeEach(resetStaffMocks);

describe("bank review server actions", () => {
  it("refuses support staff without calling the backend", async () => {
    signedInAs("support");

    await expect(approveBankAccount(accountId)).resolves.toMatchObject({ status: "error", code: "forbidden" });
    await expect(rejectBankAccount(accountId, "Name differs")).resolves.toMatchObject({ status: "error" });
    expect(writes()).toEqual([]);
  });

  it("approves for ops and returns the account", async () => {
    const approved = { ...bankAccount, status: "verified", isPrimary: true };
    signedInAs("ops", () => ok({ account: approved }));

    await expect(approveBankAccount(accountId)).resolves.toEqual({ status: "ok", data: approved });
    expect(writes()).toEqual([[`/v1/admin/bank-accounts/${accountId}/approve`, { method: "POST", token: "token-1" }]]);
  });

  it("rejects with a validated reason", async () => {
    signedInAs("owner", () => ok({ account: { ...bankAccount, status: "rejected", reviewNote: "Joint account" } }));

    await expect(rejectBankAccount(accountId, "ab")).resolves.toMatchObject({
      status: "error",
      code: "validation",
      errors: { reason: [expect.any(String)] },
    });
    expect(writes()).toEqual([]);

    await expect(rejectBankAccount(accountId, " Joint account ")).resolves.toMatchObject({ status: "ok" });
    expect(writes()).toEqual([
      [`/v1/admin/bank-accounts/${accountId}/reject`, { method: "POST", token: "token-1", json: { reason: "Joint account" } }],
    ]);
  });

  it("surfaces the KYC precondition from the backend", async () => {
    signedInAs("ops", () =>
      fail("kyc_not_verified", "The customer's KYC must be verified before this account can be approved", 422),
    );

    await expect(approveBankAccount(accountId)).resolves.toEqual({
      status: "error",
      code: "kyc_not_verified",
      message: "The customer's KYC must be verified before this account can be approved",
    });
  });

  it("rejects malformed ids and handles expired sessions", async () => {
    signedInAs("owner");
    await expect(approveBankAccount("1 OR 1=1")).resolves.toMatchObject({ status: "error", code: "not_found" });
    expect(writes()).toEqual([]);

    expired();
    expect(await redirectTarget(approveBankAccount(accountId))).toBe("/login?expired=1");
  });
});
