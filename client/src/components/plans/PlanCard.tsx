import Link from "next/link";
import { formatBps, formatPaise, monthlyReturnPaise } from "@nextera/contracts";
import type { Plan } from "@nextera/contracts";
import { formatTenure } from "@/lib/plans";

export function PlanCard({
  plan,
  href,
  cta,
  surface = "solid",
}: {
  plan: Plan;
  href?: string;
  cta?: string;
  surface?: "solid" | "glass";
}) {
  const example = monthlyReturnPaise(plan.minPaise, plan.rateBps);
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{formatTenure(plan.tenureMonths)}</p>
          <h3 className="mt-3 font-display text-2xl leading-tight text-parchment">{plan.name}</h3>
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-display text-4xl leading-none text-gold tnum">{formatBps(plan.rateBps)}</span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-dust">a year</span>
        </p>
      </div>
      {plan.description ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-parchment/75">{plan.description}</p> : null}
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <dt className="label">Minimum</dt>
          <dd className="mt-1 tnum text-parchment">{formatPaise(plan.minPaise)}</dd>
        </div>
        <div>
          <dt className="label">Pays monthly</dt>
          <dd className="mt-1 tnum text-parchment">
            {formatPaise(example)}
            <span className="text-dust"> at minimum</span>
          </dd>
        </div>
      </dl>
      {href && cta ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors group-hover:text-parchment">
          {cta}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </p>
      ) : null}
    </>
  );

  const glass = surface === "glass";
  const className = glass
    ? "group glass flex h-full flex-col rounded-[3px] p-6 transition-colors sm:p-7"
    : "group plate flex h-full flex-col rounded-[3px] p-6 transition-colors sm:p-7";

  if (!href) return <article className={className}>{body}</article>;

  return (
    <article className="h-full">
      <Link
        href={href}
        className={`${className} ${
          glass
            ? "hover:bg-parchment/10 focus-visible:border-lagoon"
            : "hover:border-gold/45 focus-visible:border-gold/60"
        }`}
        aria-label={`${plan.name}: ${formatBps(plan.rateBps)} a year for ${formatTenure(plan.tenureMonths)}`}
      >
        {body}
      </Link>
    </article>
  );
}
