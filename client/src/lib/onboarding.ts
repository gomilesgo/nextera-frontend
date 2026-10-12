import type { BankAccount, KycStatus } from "@nextera/contracts";
import { bankProgress } from "./bank";
import type { InvestmentSummary } from "./investmentSummary";

export type StepState = "done" | "review" | "action" | "attention" | "locked";

export type OnboardingStep = {
  id: "kyc" | "bank" | "invest";
  title: string;
  state: StepState;
  detail: string;
  href: string;
  cta: string | null;
};

const kycStep: Record<KycStatus, Pick<OnboardingStep, "state" | "detail" | "cta">> = {
  none: { state: "action", detail: "Verify your PAN, date of birth and address.", cta: "Start KYC" },
  submitted: { state: "review", detail: "Our team is reviewing your details.", cta: "View status" },
  verified: { state: "done", detail: "Your identity is verified.", cta: null },
  rejected: { state: "attention", detail: "Some details need correcting before we can verify you.", cta: "Fix and resubmit" },
};

export function onboardingSteps(
  kycStatus: KycStatus,
  accounts: readonly BankAccount[] | null,
  investmentSummary?: InvestmentSummary | null,
): OnboardingStep[] {
  const kyc: OnboardingStep = { id: "kyc", title: "Verify your identity", href: "/portal/kyc", ...kycStep[kycStatus] };

  const bankState = accounts ? bankProgress(accounts) : "none";
  const bank: OnboardingStep =
    kycStatus !== "verified"
      ? { id: "bank", title: "Add your bank account", href: "/portal/bank", state: "locked", detail: "Opens once your KYC is verified.", cta: null }
      : bankState === "verified"
        ? { id: "bank", title: "Add your bank account", href: "/portal/bank", state: "done", detail: "Your bank account is verified.", cta: null }
        : bankState === "review"
          ? {
              id: "bank",
              title: "Add your bank account",
              href: "/portal/bank",
              state: "review",
              detail: "Our team is checking your account.",
              cta: "View account",
            }
          : {
              id: "bank",
              title: "Add your bank account",
              href: "/portal/bank",
              state: "action",
              detail: "We confirm it with your bank, which may involve a small ₹1 credit.",
              cta: "Add account",
            };

  const hasInvestments =
    investmentSummary !== null &&
    investmentSummary !== undefined &&
    (investmentSummary.activeCount > 0 || investmentSummary.maturedCount > 0);

  const invest: OnboardingStep = hasInvestments
    ? {
        id: "invest",
        title: "Make your first investment",
        href: "/portal/investments",
        state: "done",
        detail: "You have active or matured investments.",
        cta: null,
      }
    : bank.state === "done"
      ? {
          id: "invest",
          title: "Make your first investment",
          href: "/portal/plans",
          state: "action",
          detail: "Choose a plan, accept your agreement with a one-time code and pay online.",
          cta: "Browse plans",
        }
      : {
          id: "invest",
          title: "Make your first investment",
          href: "/portal/plans",
          state: "locked",
          detail: "Opens once your bank account is verified.",
          cta: null,
        };

  return [kyc, bank, invest];
}

export function completedSteps(steps: readonly OnboardingStep[]): number {
  return steps.filter((step) => step.state === "done").length;
}
