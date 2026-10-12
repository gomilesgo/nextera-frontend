import { describe, expect, it } from "vitest";
import { MANUAL_ADJUSTMENT_MAX_PAISE, idempotencyKeySchema } from "@nextera/contracts";
import type { ManualAdjustmentResponse } from "@nextera/contracts";
import {
  advanceAdjustment,
  backToEdit,
  buildAdjustment,
  newIdempotencyKey,
  parseAdjustmentAmount,
  resultingBalance,
  startAdjustment,
  walletBalance,
} from "./adjustment";
import type { AdjustmentFormValues } from "./adjustment";

const key = "adj-6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";

function values(overrides: Partial<AdjustmentFormValues> = {}): AdjustmentFormValues {
  return { direction: "credit", amount: "2,500.50", reason: "Refund for failed payout", idempotencyKey: key, ...overrides };
}

describe("parseAdjustmentAmount", () => {
  it("converts rupees to whole paise", () => {
    expect(parseAdjustmentAmount("2500")).toEqual({ ok: true, paise: 250_000 });
    expect(parseAdjustmentAmount("₹ 2,500.5")).toEqual({ ok: true, paise: 250_050 });
    expect(parseAdjustmentAmount("0.29")).toEqual({ ok: true, paise: 29 });
    expect(parseAdjustmentAmount("0.01")).toEqual({ ok: true, paise: 1 });
    expect(parseAdjustmentAmount("1.10")).toEqual({ ok: true, paise: 110 });
  });

  it("allows exactly one crore and nothing above it", () => {
    expect(parseAdjustmentAmount("1,00,00,000")).toEqual({ ok: true, paise: MANUAL_ADJUSTMENT_MAX_PAISE });
    expect(parseAdjustmentAmount("10000000.00")).toEqual({ ok: true, paise: MANUAL_ADJUSTMENT_MAX_PAISE });
    expect(parseAdjustmentAmount("10000000.01")).toEqual({ ok: false, message: expect.stringContaining("limited to") });
    expect(parseAdjustmentAmount("99999999")).toEqual({ ok: false, message: expect.stringContaining("limited to") });
  });

  it("turns huge inputs into a field error instead of a RangeError", () => {
    expect(parseAdjustmentAmount("9".repeat(400))).toEqual({ ok: false, message: expect.stringContaining("limited to") });
    expect(parseAdjustmentAmount(`000000000000${"1".repeat(3)}`)).toEqual({ ok: true, paise: 11_100 });
  });

  it("rejects zero, negatives, sub-paise and non-numbers", () => {
    expect(parseAdjustmentAmount("0")).toEqual({ ok: false, message: "Amount must be above zero" });
    expect(parseAdjustmentAmount("0.00")).toEqual({ ok: false, message: "Amount must be above zero" });
    for (const raw of ["-5", "1.005", "1e5", "abc", "12..5", "Infinity", "0x10"]) {
      expect(parseAdjustmentAmount(raw).ok, raw).toBe(false);
    }
    expect(parseAdjustmentAmount("  ")).toEqual({ ok: false, message: "Enter the amount in rupees" });
  });
});

describe("buildAdjustment", () => {
  it("builds the wallet-only payload with the idempotency key", () => {
    expect(buildAdjustment(values())).toEqual({
      ok: true,
      payload: {
        direction: "credit",
        account: "wallet",
        amountPaise: 250_050,
        reason: "Refund for failed payout",
        idempotencyKey: key,
      },
    });
  });

  it("needs a reason of at least 10 characters", () => {
    expect(buildAdjustment(values({ reason: "  too short " }))).toEqual({
      ok: false,
      errors: { reason: ["Explain the adjustment in at least 10 characters"] },
    });
  });

  it("collects direction, amount and key problems as field errors", () => {
    const built = buildAdjustment(values({ direction: "transfer", amount: "100000000", idempotencyKey: "" }));
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors.direction).toEqual(["Choose credit or debit"]);
    expect(built.errors.amount).toEqual([expect.stringContaining("limited to")]);
    expect(built.errors._).toEqual([expect.stringContaining("start the adjustment again")]);
  });
});

describe("balances", () => {
  it("previews the wallet balance after the adjustment", () => {
    expect(resultingBalance(100_000, "credit", 25_000)).toBe(125_000);
    expect(resultingBalance(100_000, "debit", 25_000)).toBe(75_000);
    expect(resultingBalance(10_000, "debit", 25_000)).toBe(-15_000);
    expect(walletBalance([{ account: "principal:x", balancePaise: 5 }, { account: "wallet", balancePaise: 42 }])).toBe(42);
    expect(walletBalance([])).toBe(0);
  });
});

describe("idempotency keys", () => {
  const response: ManualAdjustmentResponse = {
    adjustment: {
      transactionId: "t1",
      customerId: "c1",
      account: "wallet",
      direction: "credit",
      amountPaise: 250_050,
      reason: "Refund for failed payout",
      idempotencyKey: key,
      createdAt: "2026-10-12T00:00:00.000Z",
    },
    balancePaise: 250_050,
    replayed: false,
  };

  it("generates keys the backend accepts", () => {
    const generated = newIdempotencyKey();
    expect(idempotencyKeySchema.safeParse(generated).success).toBe(true);
    expect(generated).not.toBe(newIdempotencyKey());
    expect(newIdempotencyKey(() => "fixed")).toBe("adj-fixed");
  });

  it("keeps one key for every review, edit and retry within a dialog session", () => {
    let calls = 0;
    const draft = startAdjustment(() => `adj-key-${++calls}`);
    expect(draft.key).toBe("adj-key-1");

    const built = buildAdjustment(values({ idempotencyKey: draft.key }));
    if (!built.ok) throw new Error("expected a payload");
    const confirm = advanceAdjustment(draft, { type: "review", values: values(), payload: built.payload });
    const edited = advanceAdjustment(confirm, { type: "edit" });
    const retried = advanceAdjustment(edited, {
      type: "review",
      values: values({ amount: "3000" }),
      payload: { ...built.payload, amountPaise: 300_000, idempotencyKey: "adj-smuggled" },
    });

    expect([confirm.key, edited.key, retried.key]).toEqual(["adj-key-1", "adj-key-1", "adj-key-1"]);
    expect(retried.step === "confirm" && retried.payload.idempotencyKey).toBe("adj-key-1");
    expect(edited.step === "edit" && edited.values).toEqual(values());
    expect(calls).toBe(1);

    const done = advanceAdjustment(retried, { type: "posted", result: response });
    expect(done).toEqual({ step: "done", key: "adj-key-1", result: response });
    expect(advanceAdjustment(done, { type: "review", values: values(), payload: built.payload })).toBe(done);

    expect(startAdjustment(() => `adj-key-${++calls}`).key).toBe("adj-key-2");
  });

  it("takes a fresh key when staff go back after an idempotency conflict", () => {
    const draft = startAdjustment(() => "adj-key-1");
    const built = buildAdjustment(values({ idempotencyKey: draft.key }));
    if (!built.ok) throw new Error("expected a payload");
    const confirm = advanceAdjustment(draft, { type: "review", values: values(), payload: built.payload });

    const edited = advanceAdjustment(confirm, backToEdit("idempotency_conflict", () => "adj-key-2"));
    expect(edited).toEqual({ step: "edit", key: "adj-key-2", values: values() });
    const reviewed = advanceAdjustment(edited, { type: "review", values: values(), payload: built.payload });
    expect(reviewed.step === "confirm" && reviewed.payload.idempotencyKey).toBe("adj-key-2");

    for (const code of [undefined, "insufficient_funds", "unavailable", "internal"]) {
      expect(advanceAdjustment(confirm, backToEdit(code, () => "adj-unused")).key).toBe("adj-key-1");
    }
  });
});
