"use client";

import { useState } from "react";
import type { AdminBankAccount } from "@nextera/contracts";
import { NameMatch } from "@/components/bank/NameMatch";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import { useBankDecision } from "@/lib/bank/mutations";

type Open = "approve" | "reject" | null;

function Comparison({ account }: { account: AdminBankAccount }) {
  return (
    <dl className="hairline grid gap-3 rounded-[3px] bg-ink/40 p-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="eyebrow">Name on KYC</dt>
        <dd className="mt-1">{account.holderName}</dd>
      </div>
      <div>
        <dt className="eyebrow">Name at bank</dt>
        <dd className="mt-1">{account.nameAtBank ?? "Not reported"}</dd>
      </div>
      <div>
        <dt className="eyebrow">Account</dt>
        <dd className="mt-1 font-mono">
          {account.accountMasked} · {account.ifsc}
        </dd>
      </div>
      <div>
        <dt className="eyebrow">Name match</dt>
        <dd className="mt-1">
          <NameMatch result={account.nameMatchResult} score={account.nameMatchScore} />
        </dd>
      </div>
    </dl>
  );
}

export function BankDecisionActions({ account }: { account: AdminBankAccount }) {
  const decision = useBankDecision(account.id, account.customerId);
  const [open, setOpen] = useState<Open>(null);
  const message = actionErrorMessage(decision.error);

  function show(next: Open) {
    decision.reset();
    setOpen(next);
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => show("approve")} aria-label={`Approve account ${account.accountMasked}`}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => show("reject")}
          aria-label={`Reject account ${account.accountMasked}`}
        >
          Reject
        </Button>
      </div>
      <ConfirmDialog
        open={open === "approve"}
        onClose={() => setOpen(null)}
        onConfirm={() => decision.mutate({ kind: "approve" }, { onSuccess: () => setOpen(null) })}
        title="Approve this bank account?"
        description="Payouts can go to this account once approved. It becomes primary if the customer has none."
        confirmLabel="Approve account"
        pendingLabel="Approving…"
        pending={decision.isPending}
        error={message}
      >
        <Comparison account={account} />
      </ConfirmDialog>
      <ConfirmDialog
        open={open === "reject"}
        onClose={() => setOpen(null)}
        onConfirm={(reason) => decision.mutate({ kind: "reject", reason }, { onSuccess: () => setOpen(null) })}
        title="Reject this bank account?"
        description="The customer sees this reason and can add a different account."
        confirmLabel="Reject account"
        pendingLabel="Rejecting…"
        tone="danger"
        pending={decision.isPending}
        error={message}
        reason={{ label: "Reason", hint: "3 to 500 characters, shown to the customer", errors: fieldErrors(decision.error).reason }}
      >
        <Comparison account={account} />
      </ConfirmDialog>
    </>
  );
}
