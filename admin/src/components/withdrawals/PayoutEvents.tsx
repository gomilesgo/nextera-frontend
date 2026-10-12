import type { PayoutEvent } from "@nextera/contracts";
import { formatDateTime, shortId } from "@/lib/format";

export function PayoutEvents({ events }: { events: PayoutEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-dust">No payout events recorded.</p>;

  return (
    <div className="hairline overflow-x-auto rounded-[3px]">
      <table className="data-table">
        <caption className="sr-only">Payout events</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Source</th>
            <th scope="col">Status</th>
            <th scope="col">Transfer ID</th>
            <th scope="col">Received</th>
            <th scope="col">Processed</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td className="font-mono text-xs">{ev.type}</td>
              <td className="text-xs text-dust">{ev.source}</td>
              <td className="font-mono text-xs">{ev.status ?? "—"}</td>
              <td className="font-mono text-xs">{ev.transferId ? shortId(ev.transferId) : "—"}</td>
              <td className="text-xs text-dust">{formatDateTime(ev.receivedAt)}</td>
              <td className="text-xs text-dust">{ev.processedAt ? formatDateTime(ev.processedAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
