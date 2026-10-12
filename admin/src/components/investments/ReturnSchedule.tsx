import { formatPaise } from "@nextera/contracts";
import type { InvestmentGrowth } from "@nextera/contracts";
import { DetailItem, DetailList, Section } from "@/components/investments/DetailList";
import { Badge } from "@/components/ui/Badge";
import { formatIsoDate } from "@/lib/format";

function money(paise: number | null): string {
  return paise === null ? "—" : formatPaise(paise);
}

export function ReturnSchedule({ growth }: { growth: InvestmentGrowth }) {
  const total = growth.schedule.length;
  return (
    <Section
      id="returns-heading"
      title="Returns"
      aside={growth.scheduleIsIndicative ? "Indicative schedule: dates are fixed once payment activates the bond." : null}
    >
      <DetailList>
        <DetailItem label="Principal held">{formatPaise(growth.principalBalancePaise)}</DetailItem>
        <DetailItem label="Periods credited">
          {growth.periodsCredited} of {total}
        </DetailItem>
        <DetailItem label="Credited gross">{formatPaise(growth.creditedGrossPaise)}</DetailItem>
        <DetailItem label="Credited net of TDS">{formatPaise(growth.creditedNetPaise)}</DetailItem>
        <DetailItem label="TDS deducted">{formatPaise(growth.tdsPaise)}</DetailItem>
        <DetailItem label="Next credit">
          {growth.nextCreditDate ? (
            <>
              {formatIsoDate(growth.nextCreditDate)}
              <span className="text-dust"> · {money(growth.nextCreditPaise)} gross</span>
            </>
          ) : (
            "—"
          )}
        </DetailItem>
      </DetailList>
      {total === 0 ? null : (
        <div className="hairline max-h-[28rem] overflow-auto rounded-[3px]">
          <table className="data-table">
            <caption className="sr-only">Monthly return schedule</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  #
                </th>
                <th scope="col">Due</th>
                <th scope="col" className="num">
                  Gross
                </th>
                <th scope="col" className="num">
                  Cumulative
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Net credited
                </th>
                <th scope="col" className="num">
                  TDS
                </th>
              </tr>
            </thead>
            <tbody>
              {growth.schedule.map((period) => (
                <tr key={period.periodNo}>
                  <td className="num font-mono">{period.periodNo}</td>
                  <td className="whitespace-nowrap">{formatIsoDate(period.dueDate)}</td>
                  <td className="num font-mono">{formatPaise(period.grossPaise)}</td>
                  <td className="num font-mono text-dust">{formatPaise(period.cumulativePaise)}</td>
                  <td>{period.credited ? <Badge tone="success">Credited</Badge> : <Badge>Due</Badge>}</td>
                  <td className="num font-mono">{money(period.netPaise)}</td>
                  <td className="num font-mono text-dust">{money(period.tdsPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
