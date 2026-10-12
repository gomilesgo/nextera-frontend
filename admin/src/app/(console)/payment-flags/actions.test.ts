import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymous, expired, fail, ok, redirectTarget, resetStaffMocks, signedInAs, writes, cookieStore } from "@/test/staff";
import { flag, flagId, ledgerTransactionId } from "@/test/investments";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { resolvePaymentFlag } = await import("./actions");

const note = "Refund issued in the Cashfree dashboard";
const resolvePath = `/v1/admin/payments/flags/${flagId}/resolve`;
const resolved = { ...flag, resolvedAt: "2026-10-12T10:00:00.000Z", resolutionType: "refunded", resolutionReference: "rf_1", resolutionNote: note };

beforeEach(resetStaffMocks);

describe("resolvePaymentFlag", () => {
  it("refuses support staff without calling the backend", async () => {
    signedInAs("support");

    await expect(resolvePaymentFlag(flagId, { resolution: "refunded", refundId: "rf_1", note })).resolves.toEqual({
      status: "error",
      code: "forbidden",
      message: "Your role does not allow this action",
    });
    expect(writes()).toEqual([]);
  });

  it("lets ops record a refund with the bearer token", async () => {
    signedInAs("ops", () => ok({ flag: resolved }));

    await expect(resolvePaymentFlag(flagId, { resolution: "refunded", refundId: " rf_1 ", note })).resolves.toEqual({
      status: "ok",
      data: resolved,
    });
    expect(writes()).toEqual([
      [resolvePath, { method: "POST", token: "token-1", json: { resolution: "refunded", refundId: "rf_1", note } }],
    ]);
  });

  it("lets the owner record a manual posting or an activation", async () => {
    signedInAs("owner", () => ok({ flag: resolved }));

    await resolvePaymentFlag(flagId, { resolution: "posted_manually", ledgerTransactionId, refundId: "rf_9", note });
    await resolvePaymentFlag(flagId, { resolution: "activated", refundId: "rf_9", note });
    expect(writes().map(([, init]) => init?.json)).toEqual([
      { resolution: "posted_manually", ledgerTransactionId, note },
      { resolution: "activated", note },
    ]);
  });

  it("validates each resolution type before calling the backend", async () => {
    signedInAs("owner");

    await expect(resolvePaymentFlag(flagId, { resolution: "refunded", refundId: "", note })).resolves.toMatchObject({
      status: "error",
      code: "validation",
      errors: { refundId: ["Enter the Cashfree refund id"] },
    });
    await expect(
      resolvePaymentFlag(flagId, { resolution: "posted_manually", ledgerTransactionId: "123", note }),
    ).resolves.toMatchObject({ errors: { ledgerTransactionId: ["Enter the ledger transaction id"] } });
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note: "" })).resolves.toMatchObject({
      errors: { note: ["Explain how this was resolved"] },
    });
    await expect(resolvePaymentFlag(flagId, { resolution: "written_off", note })).resolves.toMatchObject({
      errors: { resolution: [expect.any(String)] },
    });
    await expect(resolvePaymentFlag(flagId, "refunded")).resolves.toMatchObject({ status: "error", code: "validation" });
    expect(writes()).toEqual([]);
  });

  it("rejects a malformed flag id before calling the backend", async () => {
    signedInAs("owner");

    await expect(resolvePaymentFlag("../staff", { resolution: "activated", note })).resolves.toMatchObject({
      status: "error",
      code: "not_found",
    });
    expect(writes()).toEqual([]);
  });

  it("maps backend refusals to clear messages and fields", async () => {
    signedInAs("ops", () =>
      fail(
        "conflict",
        "Only a flag whose payment went on to activate its investment can be resolved as activated",
        409,
      ),
    );
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toEqual({
      status: "error",
      code: "conflict",
      message: "Only a flag whose payment went on to activate its investment can be resolved as activated",
    });

    signedInAs("ops", () => fail("conflict", "This flag is already resolved", 409));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toMatchObject({
      message: "This flag is already resolved",
    });

    signedInAs("ops", () =>
      fail("validation", "No ledger transaction has this id", 400, { ledgerTransactionId: ["No ledger transaction has this id"] }),
    );
    await expect(
      resolvePaymentFlag(flagId, { resolution: "posted_manually", ledgerTransactionId, note }),
    ).resolves.toEqual({
      status: "error",
      code: "validation",
      message: "Please check the highlighted fields.",
      errors: { ledgerTransactionId: ["No ledger transaction has this id"] },
    });

    signedInAs("ops", () => fail("not_found", "Flagged payment not found", 404));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toMatchObject({
      code: "not_found",
      message: expect.stringContaining("no longer exists"),
    });
  });

  it("warns that an unknown outcome may already be recorded", async () => {
    const mayHave = "This resolution may already have been recorded. Refresh the flag before trying again.";
    signedInAs("ops", () => ok({ flag: { id: flagId } }));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toEqual({
      status: "error",
      code: "internal",
      message: mayHave,
    });

    signedInAs("ops", () => fail("internal", "duplicate key value violates unique constraint", 500));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toEqual({
      status: "error",
      code: "internal",
      message: mayHave,
    });

    signedInAs("ops", () => fail("unavailable", "Could not reach the server. Please try again.", 503));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toMatchObject({
      code: "unavailable",
      message: mayHave,
    });
  });

  it("never passes raw backend messages for unexpected codes", async () => {
    signedInAs("ops", () => fail("forbidden", "role owner,ops required by requireStaff", 403));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toEqual({
      status: "error",
      code: "forbidden",
      message: "Your role does not allow this action",
    });

    signedInAs("ops", () => fail("insufficient_funds", "internal ledger detail", 422));
    await expect(resolvePaymentFlag(flagId, { resolution: "activated", note })).resolves.toEqual({
      status: "error",
      code: "insufficient_funds",
      message: "The flag could not be resolved. Please try again.",
    });
  });

  it("redirects anonymous, expired and pending-password sessions", async () => {
    anonymous();
    expect(await redirectTarget(resolvePaymentFlag(flagId, { resolution: "activated", note }))).toBe("/login");

    expired();
    expect(await redirectTarget(resolvePaymentFlag(flagId, { resolution: "activated", note }))).toBe("/login?expired=1");
    expect(cookieStore.set).toHaveBeenCalledWith(expect.any(String), "", expect.objectContaining({ maxAge: 0 }));

    signedInAs("ops", undefined, { mustChangePassword: true });
    expect(await redirectTarget(resolvePaymentFlag(flagId, { resolution: "activated", note }))).toBe("/account/password");
    expect(writes()).toEqual([]);

    signedInAs("ops", () => fail("password_change_required", "Change your password", 403));
    expect(await redirectTarget(resolvePaymentFlag(flagId, { resolution: "activated", note }))).toBe("/account/password");
  });
});
