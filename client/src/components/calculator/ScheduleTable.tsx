import { formatPaise } from "@nextera/contracts";
import type { SchedulePeriod } from "@nextera/contracts";
import { formatIsoDate } from "@/lib/dates";

export function ScheduleTable({ principalPaise, schedule }: { principalPaise: number; schedule: SchedulePeriod[] }) {
  return (
    <div className="max-h-96 overflow-auto border-t border-border">
      <table className="data-table text-sm">
        <caption className="sr-only">Projected monthly credits</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Credit date</th>
            <th scope="col" className="num">
              Return
            </th>
            <th scope="col" className="num">
              Returns to date
            </th>
            <th scope="col" className="num">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((period) => (
            <tr key={period.periodNo}>
              <td className="font-mono text-dust tnum">{period.periodNo}</td>
              <td className="whitespace-nowrap">{formatIsoDate(period.dueDate)}</td>
              <td className="num">{formatPaise(period.grossPaise)}</td>
              <td className="num">{formatPaise(period.cumulativePaise)}</td>
              <td className="num text-parchment">{formatPaise(principalPaise + period.cumulativePaise)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="text-dust">
              Principal returned at maturity
            </td>
            <td className="num font-medium text-gold">{formatPaise(principalPaise)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
