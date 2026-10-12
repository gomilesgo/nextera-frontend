import { describe, expect, it } from "vitest";
import { formatPaise } from "@nextera/contracts";
import type { StatementEntry } from "@nextera/contracts";
import { checkoutOutcome } from "./cashfree";
import { growthPoints, lastCreditedMonth } from "./investmentGrowth";
import { accountLabel, describeEntry, signedAmount, toPortalEntry, toPortalStatementPage } from "./statements";

const ID = "6f1c2a0e-3b4d-4c5e-8f90-123456789abc";
const plans = new Map([[ID, "Steady 12"]]);

function raw(overrides: Partial<StatementEntry>): StatementEntry {
  return {
    id: "e1",
    transactionId: "t1",
    account: "wallet",
    investmentId: null,
    direction: "credit",
    amountPaise: 900_000,
    refType: "accrual",
    refId: "a1",
    memo: "",
    createdAt: "2026-11-01T00:30:00.000Z",
    ...overrides,
  };
}

function entry(overrides: Partial<StatementEntry>) {
  return toPortalEntry(raw(overrides));
}

describe("toPortalEntry", () => {
  it("drops the memo and keeps only the accrual period and investment", () => {
    const portal = toPortalEntry(raw({ memo: `Return for period 7 of investment ${ID}, due 2027-05-01` }));
    expect(portal).not.toHaveProperty("memo");
    expect(portal).not.toHaveProperty("refId");
    expect(portal).not.toHaveProperty("transactionId");
    expect(portal.periodNo).toBe(7);
    expect(portal.investmentId).toBe(ID);
    const adjustment = toPortalEntry(raw({ refType: "manual_adjustment", memo: `period 9 of investment ${ID} goodwill` }));
    expect(adjustment.periodNo).toBeNull();
    expect(adjustment.investmentId).toBeNull();
    expect(JSON.stringify(toPortalStatementPage({ entries: [raw({ memo: "staff note" })], nextCursor: "3" }))).not.toMatch(/staff note/);
  });
});

describe("describeEntry", () => {
  it("names monthly returns with the month and plan", () => {
    const accrual = entry({ memo: `Return for period 3 of investment ${ID}, due 2027-01-01` });
    expect(describeEntry(accrual, plans)).toEqual({ title: "Monthly return credited", detail: "Month 3 · Steady 12" });
  });

  it("describes funding and maturity legs", () => {
    expect(describeEntry(entry({ refType: "payment", account: `principal:${ID}`, investmentId: ID }), plans)).toEqual({
      title: "Investment funded",
      detail: "Steady 12",
    });
    expect(describeEntry(entry({ refType: "maturity", account: `principal:${ID}`, investmentId: ID, direction: "debit" }), plans).title).toBe(
      "Principal released at maturity",
    );
    expect(describeEntry(entry({ refType: "maturity" })).title).toBe("Matured principal added to wallet");
  });

  it("never shows staff memos or unknown internals", () => {
    const adjustment = describeEntry(entry({ refType: "manual_adjustment", memo: "Goodwill per ticket 123, approved by ops" }));
    expect(adjustment.title).toBe("Adjustment credited");
    expect(JSON.stringify(adjustment)).not.toMatch(/ticket|ops/);
    expect(describeEntry(entry({ refType: "withdrawal", account: "withdrawal_hold" })).title).toBe("Held for withdrawal");
    expect(describeEntry(entry({ refType: "mystery", account: "wallet", direction: "debit", memo: "secret" })).title).toBe("Debit from wallet");
  });

  it("labels accounts and signs amounts with contracts formatting", () => {
    expect(accountLabel("wallet")).toBe("Wallet");
    expect(accountLabel(`principal:${ID}`)).toBe("Invested principal");
    expect(signedAmount({ direction: "credit", amountPaise: 900_000 })).toBe(`+${formatPaise(900_000)}`);
    expect(signedAmount({ direction: "debit", amountPaise: 12_345 })).toBe("−₹123.45");
    expect(formatPaise(900_000)).toBe("₹9,000");
  });
});

describe("growthPoints", () => {
  it("starts at zero and follows the backend schedule", () => {
    const points = growthPoints(
      {
        schedule: [
          { periodNo: 1, dueDate: "2026-11-01", grossPaise: 900_000, cumulativePaise: 900_000, credited: true, netPaise: 900_000, tdsPaise: 0 },
          { periodNo: 2, dueDate: "2026-12-01", grossPaise: 900_000, cumulativePaise: 1_800_000, credited: false, netPaise: null, tdsPaise: null },
        ],
      },
      "2026-10-01",
    );
    expect(points.map((point) => point.returnsPaise)).toEqual([0, 900_000, 1_800_000]);
    expect(lastCreditedMonth(points)).toBe(1);
  });
});

describe("checkoutOutcome", () => {
  it("never treats the checkout result as proof of payment, only as a navigation hint", () => {
    expect(checkoutOutcome({ paymentDetails: { paymentMessage: "Payment finished" } })).toBe("completed");
    expect(checkoutOutcome({ redirect: true })).toBe("redirecting");
    expect(checkoutOutcome({ error: { message: "closed" } })).toBe("closed");
    expect(checkoutOutcome(null)).toBe("closed");
  });
});
