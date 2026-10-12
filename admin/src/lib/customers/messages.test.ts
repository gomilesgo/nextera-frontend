import { describe, expect, it } from "vitest";
import { ADJUSTMENT_MAY_HAVE_POSTED, adjustmentFailure, profileFailure, statusFailure } from "./messages";
import { ActionError, unwrapOutcome } from "@/lib/actions/outcome";

describe("adjustmentFailure", () => {
  it("explains insufficient funds on the amount field", () => {
    expect(adjustmentFailure({ code: "insufficient_funds", message: "Insufficient balance for this operation" })).toEqual({
      status: "error",
      code: "insufficient_funds",
      message: "The wallet does not hold enough to cover this debit. Nothing was posted.",
      errors: { amount: ["Debit is more than the wallet balance"] },
    });
  });

  it("explains closed customers and reused idempotency keys", () => {
    expect(adjustmentFailure({ code: "customer_closed", message: "closed" })).toMatchObject({
      code: "customer_closed",
      message: expect.stringContaining("closed"),
    });
    expect(
      adjustmentFailure({ code: "conflict", message: "This idempotency key was already used for a different adjustment" }),
    ).toMatchObject({ code: "idempotency_conflict", message: expect.stringContaining("Nothing new was posted") });
  });

  it("tells staff to retry in place when the outcome of the post is unknown", () => {
    for (const code of ["unavailable", "internal"] as const) {
      expect(adjustmentFailure({ code, message: "Backend unreachable" })).toEqual({
        status: "error",
        code,
        message: ADJUSTMENT_MAY_HAVE_POSTED,
      });
    }
    expect(ADJUSTMENT_MAY_HAVE_POSTED).toContain("Try again");
    expect(ADJUSTMENT_MAY_HAVE_POSTED).toContain("Do not start a new adjustment");
  });

  it("maps backend validation fields onto the form", () => {
    expect(
      adjustmentFailure({
        code: "validation",
        message: "Invalid",
        fields: { amountPaise: ["Amount is above the manual adjustment limit"], reason: ["Too short"] },
      }),
    ).toEqual({
      status: "error",
      code: "validation",
      message: "Please check the highlighted fields.",
      errors: { amount: ["Amount is above the manual adjustment limit"], reason: ["Too short"] },
    });
  });
});

describe("statusFailure", () => {
  it("lists every reason a close was refused", () => {
    expect(
      statusFailure("close", {
        code: "conflict",
        message: "This customer cannot be closed: wallet holds ₹1,500",
        fields: { closure: ["wallet holds ₹1,500", "withdrawal_hold holds ₹200"] },
      }),
    ).toEqual({
      status: "error",
      code: "closure_blocked",
      message: "This customer cannot be closed yet:",
      errors: { closure: ["wallet holds ₹1,500", "withdrawal_hold holds ₹200"] },
    });
  });

  it("passes transition conflicts through", () => {
    expect(statusFailure("block", { code: "conflict", message: "This customer is already blocked" })).toEqual({
      status: "error",
      code: "conflict",
      message: "This customer is already blocked",
    });
  });
});

describe("profileFailure", () => {
  it("puts a duplicate phone on the phone field", () => {
    const message = "A customer with this mobile number already exists";
    expect(profileFailure({ code: "conflict", message, fields: { phone: [message] } })).toEqual({
      status: "error",
      code: "conflict",
      message,
      errors: { phone: [message] },
    });
  });
});

describe("unwrapOutcome", () => {
  it("throws failures as typed errors", () => {
    expect(unwrapOutcome({ status: "ok", data: 1 })).toBe(1);
    try {
      unwrapOutcome({ status: "error", code: "conflict", message: "Taken", errors: { phone: ["Taken"] } });
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ActionError);
      expect(error).toMatchObject({ code: "conflict", message: "Taken", errors: { phone: ["Taken"] } });
    }
  });
});
