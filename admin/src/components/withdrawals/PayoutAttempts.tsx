import type { Payout } from "@nextera/contracts";
import { formatPaise } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, shortId } from "@/lib/format";

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  processing: "info",
  success: "success",
  failed: "danger",
  reversed: "danger",
};

export function PayoutAttempts({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) return <p className="text-sm text-dust">No payout attempts yet.</p>;

  return (
    <div className="hairline overflow-x-auto rounded-[3px]">
      <table className="data-table">
        <caption className="sr-only">Payout attempts</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Transfer ID</th>
            <th scope="col">Status</th>
            <th scope="col">Gateway status</th>
            <th scope="col" className="num">Amount</th>
            <th scope="col">Submitted</th>
            <th scope="col">Settled</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id}>
              <td className="font-mono text-xs">{p.attemptNo}</td>
              <td className="font-mono text-xs">
                <span title={p.transferId}>{shortId(p.transferId)}</span>
                {p.cfTransferId ? (
                  <span className="ml-1 text-dust" title={p.cfTransferId}>
                    / {shortId(p.cfTransferId)}
                  </span>
                ) : null}
              </td>
              <td>
                <Badge tone={statusTones[p.status] ?? "neutral"}>{p.status}</Badge>
                {p.unconfirmedAt ? <span className="ml-1 text-xs text-gold">unconfirmed</span> : null}
              </td>
              <td className="font-mono text-xs text-dust">
                {p.gatewayStatus ?? "—"}
                {p.gatewayStatusCode ? ` (${p.gatewayStatusCode})` : null}
              </td>
              <td className="num">{formatPaise(p.amountPaise)}</td>
              <td className="text-xs text-dust">{formatDateTime(p.submittedAt)}</td>
              <td className="text-xs text-dust">{p.settledAt ? formatDateTime(p.settledAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
