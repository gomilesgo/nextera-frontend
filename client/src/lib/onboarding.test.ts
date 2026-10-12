import { describe, expect, it } from "vitest";
import type { BankAccount } from "@nextera/contracts";
import { completedSteps, onboardingSteps } from "./onboarding";

const verified: BankAccount = {
  id: "7f0c1c2e-1b7a-4d55-9a37-1f0f5b6a2c11",
  accountMasked: "XXXX9012",
  accountLast4: "9012",
  ifsc: "HDFC0001234",
  holderName: "Asha Rao",
  nameAtBank: "ASHA RAO",
  nameMatchResult: "DIRECT_MATCH",
  status: "verified",
  isPrimary: true,
  verifiedAt: "2026-10-11T06:00:00.000Z",
  reviewNote: null,
  createdAt: "2026-10-11T06:00:00.000Z",
};

function states(...args: Parameters<typeof onboardingSteps>) {
  return onboardingSteps(...args).map((step) => step.state);
}

describe("onboardingSteps", () => {
  it("starts with KYC and locks the rest", () => {
    expect(states("none", [])).toEqual(["action", "locked", "locked"]);
    expect(states("submitted", null)).toEqual(["review", "locked", "locked"]);
    expect(states("rejected", [{ ...verified, status: "review" }])).toEqual(["attention", "locked", "locked"]);
  });

  it("opens the bank step once KYC is verified", () => {
    expect(states("verified", [])).toEqual(["done", "action", "locked"]);
    expect(states("verified", [{ ...verified, status: "review", isPrimary: false }])).toEqual(["done", "review", "locked"]);
    expect(states("verified", [{ ...verified, status: "rejected", isPrimary: false }])).toEqual(["done", "action", "locked"]);
  });

  it("points to plans once a bank account is verified", () => {
    const steps = onboardingSteps("verified", [verified]);
    expect(steps.map((step) => step.state)).toEqual(["done", "done", "action"]);
    expect(steps[2]?.href).toBe("/portal/plans");
    expect(completedSteps(steps)).toBe(2);
  });

  it("links every step to its screen", () => {
    expect(onboardingSteps("none", []).map((step) => step.href)).toEqual(["/portal/kyc", "/portal/bank", "/portal/plans"]);
  });

  it("marks invest as done when the customer has active investments", () => {
    const summary = { activeCount: 1, pendingCount: 0, maturedCount: 0, investedPaise: 100000, creditedNetPaise: 0, tdsPaise: 0, nextCredit: null, complete: true };
    const steps = onboardingSteps("verified", [verified], summary);
    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done"]);
    expect(steps[2]?.href).toBe("/portal/investments");
    expect(completedSteps(steps)).toBe(3);
  });

  it("marks invest as done when the customer has matured investments", () => {
    const summary = { activeCount: 0, pendingCount: 0, maturedCount: 2, investedPaise: 0, creditedNetPaise: 900000, tdsPaise: 90000, nextCredit: null, complete: true };
    const steps = onboardingSteps("verified", [verified], summary);
    expect(steps[2]?.state).toBe("done");
  });

  it("does not mark invest done when summary has no active or matured investments", () => {
    const summary = { activeCount: 0, pendingCount: 1, maturedCount: 0, investedPaise: 0, creditedNetPaise: 0, tdsPaise: 0, nextCredit: null, complete: false };
    const steps = onboardingSteps("verified", [verified], summary);
    expect(steps[2]?.state).toBe("action");
  });

  it("uses existing behaviour when investmentSummary is undefined", () => {
    const steps = onboardingSteps("verified", [verified], undefined);
    expect(steps[2]?.state).toBe("action");
  });
});
