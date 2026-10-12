import Link from "next/link";
import type { BankAccount, KycStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { cx } from "@/lib/cx";
import type { InvestmentSummary } from "@/lib/investmentSummary";
import { completedSteps, onboardingSteps } from "@/lib/onboarding";
import type { StepState } from "@/lib/onboarding";

const stateBadge: Record<StepState, { label: string; tone: BadgeTone }> = {
  done: { label: "Done", tone: "success" },
  review: { label: "In review", tone: "info" },
  action: { label: "To do", tone: "warning" },
  attention: { label: "Needs attention", tone: "danger" },
  locked: { label: "Locked", tone: "neutral" },
};

export function OnboardingChecklist({
  kycStatus,
  accounts,
  accountsUnavailable,
  investmentSummary,
}: {
  kycStatus: KycStatus;
  accounts: readonly BankAccount[] | null;
  accountsUnavailable?: boolean;
  investmentSummary?: InvestmentSummary | null;
}) {
  const steps = onboardingSteps(kycStatus, accounts, investmentSummary);
  const done = completedSteps(steps);
  const percent = Math.round((done / steps.length) * 100);

  return (
    <section aria-labelledby="onboarding-heading" className="hairline rounded-[2px] bg-horizon p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="onboarding-heading" className="label">
          Get ready to invest
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust tnum">
          {done} of {steps.length} complete
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${steps.length} steps complete`}
        className="mt-4 h-1 overflow-hidden rounded-full bg-parchment/10"
      >
        <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-6 grid gap-3">
        {steps.map((step, index) => {
          const badge = stateBadge[step.state];
          const locked = step.state === "locked";
          return (
            <li
              key={step.id}
              className={cx(
                "flex flex-col gap-3 rounded-[2px] border p-4 sm:flex-row sm:items-center sm:justify-between",
                step.state === "attention" ? "border-ember/40" : "border-border",
              )}
            >
              <div className="flex min-w-0 items-start gap-4">
                <span
                  aria-hidden="true"
                  className={cx(
                    "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                    step.state === "done" ? "bg-moss/20 text-moss" : locked ? "border border-parchment/15 text-dust" : "border border-gold/50 text-gold",
                  )}
                >
                  {step.state === "done" ? "✓" : index + 1}
                </span>
                <div className="min-w-0">
                  <p className={cx("font-medium", locked ? "text-dust" : "text-parchment")}>
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-parchment/70">{step.detail}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 pl-12 sm:pl-0">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {step.cta ? (
                  <Link href={step.href} className="text-sm text-gold underline-offset-4 hover:underline">
                    {step.cta}
                    <span className="sr-only"> for {step.title.toLowerCase()}</span>
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {accountsUnavailable ? (
        <p className="mt-4 text-xs text-dust">Your bank account status is taking a moment to load.</p>
      ) : null}
    </section>
  );
}
