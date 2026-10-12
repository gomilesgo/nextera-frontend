"use client";

import { useId, useMemo, useState } from "react";
import { formatBps, formatPaise } from "@nextera/contracts";
import type { Plan } from "@nextera/contracts";
import { controlClass } from "@/components/ui/Field";
import { defaultAmountPaise, formatRupeesInput, parseRupeesInput, quote } from "@/lib/calculator";
import { cx } from "@/lib/cx";
import { formatIsoDate } from "@/lib/dates";
import { formatTenure } from "@/lib/plans";
import { GrowthChart } from "./GrowthChart";
import { ScheduleTable } from "./ScheduleTable";

const QUICK_AMOUNTS = [5_000_000, 10_000_000, 50_000_000, 135_000_000];

type Props = {
  plans: Plan[];
  startDate: string;
  initialSlug?: string;
  initialAmountPaise?: number;
  lockPlan?: boolean;
  note?: string;
};

function Stat({ label, value, sub, lead }: { label: string; value: string; sub?: string; lead?: boolean }) {
  return (
    <div className={cx("min-w-0", lead ? "col-span-2" : undefined)}>
      <dt className="label">{label}</dt>
      <dd
        className={cx(
          "mt-2 break-words tnum",
          lead ? "font-display text-[clamp(2rem,6vw,3.25rem)] leading-none text-gold" : "text-xl font-medium text-parchment sm:text-2xl",
        )}
      >
        {value}
      </dd>
      {sub ? <dd className="mt-1 text-xs text-dust">{sub}</dd> : null}
    </div>
  );
}

export function ReturnsCalculator({ plans, startDate, initialSlug, initialAmountPaise, lockPlan, note }: Props) {
  const fallback = plans[0];
  const initialPlan = plans.find((plan) => plan.slug === initialSlug) ?? fallback;
  const [slug, setSlug] = useState(initialPlan?.slug ?? "");
  const [amountText, setAmountText] = useState(() =>
    initialPlan ? formatRupeesInput(initialAmountPaise ?? defaultAmountPaise(initialPlan)) : "",
  );
  const amountId = useId();
  const amountHintId = useId();

  const plan = plans.find((candidate) => candidate.slug === slug) ?? fallback;
  const amountPaise = parseRupeesInput(amountText);
  const result = useMemo(
    () => (plan ? quote({ plan, amountPaise, startDate }) : null),
    [plan, amountPaise, startDate],
  );

  if (!plan || !result) return null;

  const quickAmounts = QUICK_AMOUNTS.filter((value) => value >= plan.minPaise && value <= plan.maxPaise);

  function choosePlan(next: string) {
    setSlug(next);
    const chosen = plans.find((candidate) => candidate.slug === next);
    const current = parseRupeesInput(amountText);
    if (chosen && (typeof current !== "number" || current < chosen.minPaise || current > chosen.maxPaise)) {
      setAmountText(formatRupeesInput(defaultAmountPaise(chosen)));
    }
  }

  return (
    <div className="hairline overflow-hidden rounded-[2px] bg-horizon">
      <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid content-start gap-6 border-b border-border p-5 sm:p-8 lg:border-b-0 lg:border-r">
          {lockPlan || plans.length === 1 ? (
            <div>
              <p className="label">Plan</p>
              <p className="mt-2 font-display text-2xl text-parchment">{plan.name}</p>
              <p className="mt-1 text-sm text-dust">
                {formatBps(plan.rateBps)} a year · {formatTenure(plan.tenureMonths)}
              </p>
            </div>
          ) : (
            <fieldset>
              <legend className="label">Plan</legend>
              <div className="mt-3 grid gap-2">
                {plans.map((candidate) => {
                  const checked = candidate.slug === plan.slug;
                  return (
                    <label
                      key={candidate.slug}
                      className={cx(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-[2px] border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lagoon/50",
                        checked ? "border-gold/60 bg-gold/10" : "border-parchment/12 hover:border-parchment/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="calculator-plan"
                        value={candidate.slug}
                        checked={checked}
                        onChange={() => choosePlan(candidate.slug)}
                        className="sr-only"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-parchment">{candidate.name}</span>
                        <span className="block text-xs text-dust">{formatTenure(candidate.tenureMonths)}</span>
                      </span>
                      <span className={cx("shrink-0 font-mono text-sm tnum", checked ? "text-gold" : "text-parchment/80")}>
                        {formatBps(candidate.rateBps)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="grid gap-2">
            <label htmlFor={amountId} className="label">
              Amount to invest
            </label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-dust">
                ₹
              </span>
              <input
                id={amountId}
                inputMode="decimal"
                autoComplete="off"
                value={amountText}
                onChange={(event) => setAmountText(event.target.value)}
                onBlur={() => {
                  const parsed = parseRupeesInput(amountText);
                  if (typeof parsed === "number") setAmountText(formatRupeesInput(parsed));
                }}
                aria-invalid={!result.ok || undefined}
                aria-describedby={amountHintId}
                className={cx(controlClass, "h-14 pl-9 text-2xl font-medium tnum")}
              />
            </div>
            <p id={amountHintId} className={cx("text-xs", result.ok ? "text-dust" : "text-ember")}>
              {result.ok ? `Between ${formatPaise(plan.minPaise)} and ${formatPaise(plan.maxPaise)}` : result.message}
            </p>
            {quickAmounts.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {quickAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmountText(formatRupeesInput(value))}
                    className={cx(
                      "min-h-9 rounded-full border px-3 text-xs tnum transition-colors",
                      amountPaise === value
                        ? "border-gold/60 bg-gold/10 text-gold"
                        : "border-parchment/15 text-parchment/75 hover:border-lagoon hover:text-lagoon",
                    )}
                  >
                    {formatPaise(value)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {note ? <p className="text-xs leading-5 text-dust">{note}</p> : null}
        </div>

        <div className="grid min-w-0 content-start gap-8 p-5 sm:p-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6" aria-live="polite">
            <Stat
              lead
              label="Monthly return"
              value={result.ok ? formatPaise(result.summary.monthlyPaise) : "—"}
              sub={`${formatBps(plan.rateBps)} a year, simple interest, credited monthly`}
            />
            <Stat label="Total returns" value={result.ok ? formatPaise(result.summary.totalReturnPaise) : "—"} sub={formatTenure(plan.tenureMonths)} />
            <Stat
              label="Maturity value"
              value={result.ok ? formatPaise(result.summary.maturityValuePaise) : "—"}
              sub={result.ok ? `on ${formatIsoDate(result.summary.maturityDate)}` : undefined}
            />
          </dl>
          {result.ok ? <GrowthChart points={result.points} /> : null}
        </div>
      </div>
      {result.ok ? (
        <details className="group border-t border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm text-parchment/85 hover:text-parchment sm:px-8 [&::-webkit-details-marker]:hidden">
            <span>Month-by-month schedule ({result.schedule.length} credits)</span>
            <span aria-hidden="true" className="font-mono text-dust transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <ScheduleTable principalPaise={result.principalPaise} schedule={result.schedule} />
        </details>
      ) : null}
    </div>
  );
}
