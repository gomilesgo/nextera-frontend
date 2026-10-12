import { formatBps, formatPaise } from "@nextera/contracts";
import { formatTenure } from "@/lib/plans";

export function TermsAside({
  planName,
  principalPaise,
  rateBps,
  tenureMonths,
  monthlyReturnPaise,
}: {
  planName: string;
  principalPaise: number;
  rateBps: number;
  tenureMonths: number;
  monthlyReturnPaise: number;
}) {
  return (
    <aside aria-labelledby="terms-aside-heading" className="hairline rounded-[2px] p-6">
      <h2 id="terms-aside-heading" className="label">
        Your investment
      </h2>
      <p className="mt-3 font-display text-2xl">{planName}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div className="col-span-2">
          <dt className="label">Amount</dt>
          <dd className="mt-1 font-display text-3xl text-gold tnum">{formatPaise(principalPaise)}</dd>
        </div>
        <div>
          <dt className="label">Rate</dt>
          <dd className="mt-1 text-parchment tnum">{formatBps(rateBps)} a year</dd>
        </div>
        <div>
          <dt className="label">Tenure</dt>
          <dd className="mt-1 text-parchment tnum">{formatTenure(tenureMonths)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="label">Monthly return</dt>
          <dd className="mt-1 text-parchment tnum">{formatPaise(monthlyReturnPaise)} before TDS</dd>
        </div>
      </dl>
      <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-dust">
        Returns start from the day your payment is confirmed. Your principal is returned at maturity.
      </p>
    </aside>
  );
}
