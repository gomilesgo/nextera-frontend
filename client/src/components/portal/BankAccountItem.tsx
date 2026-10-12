import { useState } from "react";
import type { BankAccount } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bankStatusCopy, canBePrimary } from "@/lib/bank";
import type { BankTone } from "@/lib/bank";
import { cx } from "@/lib/cx";
import { formatTimestamp } from "@/lib/dates";
import { accountEnding } from "@/lib/mask";

const tone: Record<BankTone, BadgeTone> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  danger: "danger",
  warning: "warning",
};

export function BankAccountItem({
  account,
  onMakePrimary,
  onRemove,
  pending,
  removePending,
  removable,
}: {
  account: BankAccount;
  onMakePrimary?: (id: string) => void;
  onRemove?: (id: string) => void;
  pending?: boolean;
  removePending?: boolean;
  removable?: boolean;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const copy = bankStatusCopy[account.status];
  const verifiedOn = account.verifiedAt ? formatTimestamp(account.verifiedAt) : null;
  const addedOn = formatTimestamp(account.createdAt);
  const headingId = `account-${account.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className={cx(
        "hairline grid gap-5 rounded-[2px] p-5 sm:p-6",
        account.isPrimary ? "border-gold/40 bg-horizon" : "bg-horizon/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-mono text-lg tracking-[0.08em] text-parchment tnum">
            <span className="sr-only">Account ending {account.accountLast4}</span>
            <span aria-hidden="true">{accountEnding(account.accountLast4)}</span>
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-dust">IFSC {account.ifsc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {account.isPrimary ? <Badge tone="warning">Primary</Badge> : null}
          <Badge tone={tone[copy.tone]}>{copy.label}</Badge>
        </div>
      </div>

      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="label">Account holder</dt>
          <dd className="mt-1.5 break-words text-parchment">{account.holderName}</dd>
        </div>
        {account.status === "verified" && account.nameAtBank ? (
          <div className="min-w-0">
            <dt className="label">Name at bank</dt>
            <dd className="mt-1.5 break-words text-parchment">{account.nameAtBank}</dd>
          </div>
        ) : null}
        <div>
          <dt className="label">{verifiedOn ? "Verified on" : "Added on"}</dt>
          <dd className="mt-1.5 text-parchment tnum">{verifiedOn ?? addedOn ?? "—"}</dd>
        </div>
      </dl>

      {account.status !== "verified" ? (
        <div
          className={cx(
            "rounded-[2px] border px-4 py-3 text-sm leading-6",
            copy.tone === "danger" ? "border-ember/45 bg-ember/10" : "border-lagoon/30 bg-lagoon/5",
          )}
        >
          <p className="text-parchment/85">{copy.body}</p>
          {account.status === "rejected" && account.reviewNote ? (
            <p className="mt-2 break-words text-parchment">
              <span className="font-medium">Reason from our team: </span>
              {account.reviewNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {onMakePrimary && canBePrimary(account) ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMakePrimary(account.id)}
            disabled={pending}
            aria-busy={pending}
            aria-describedby={headingId}
          >
            {pending ? "Updating…" : "Make primary"}
          </Button>
        </div>
      ) : null}

      {onRemove && removable ? (
        <div>
          {confirmRemove ? (
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => { onRemove(account.id); setConfirmRemove(false); }}
                disabled={removePending}
                aria-busy={removePending}
              >
                {removePending ? "Removing…" : "Confirm remove"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRemove(true)}
              aria-describedby={headingId}
            >
              Remove
            </Button>
          )}
        </div>
      ) : null}
    </article>
  );
}
