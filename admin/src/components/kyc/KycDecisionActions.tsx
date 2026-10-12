"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import { useKycDecision } from "@/lib/kyc/mutations";

type Open = "approve" | "reject" | null;

export function KycDecisionActions({ customerId, panName }: { customerId: string; panName: string }) {
  const decision = useKycDecision(customerId);
  const [open, setOpen] = useState<Open>(null);
  const message = actionErrorMessage(decision.error);

  function show(next: Open) {
    decision.reset();
    setOpen(next);
  }

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => show("approve")}>Approve KYC</Button>
        <Button variant="danger" onClick={() => show("reject")}>
          Reject
        </Button>
      </div>
      <ConfirmDialog
        open={open === "approve"}
        onClose={() => setOpen(null)}
        onConfirm={() => decision.mutate({ kind: "approve" }, { onSuccess: () => setOpen(null) })}
        title="Approve this KYC?"
        description={`The customer will be verified as "${panName}" and can add a bank account and invest.`}
        confirmLabel="Approve"
        pendingLabel="Approving…"
        pending={decision.isPending}
        error={message}
      />
      <ConfirmDialog
        open={open === "reject"}
        onClose={() => setOpen(null)}
        onConfirm={(reason) => decision.mutate({ kind: "reject", reason }, { onSuccess: () => setOpen(null) })}
        title="Reject this KYC?"
        description="The customer sees this reason and can resubmit. Any bank accounts on file are held for review."
        confirmLabel="Reject KYC"
        pendingLabel="Rejecting…"
        tone="danger"
        pending={decision.isPending}
        error={message}
        reason={{ label: "Reason", hint: "3 to 500 characters, shown to the customer", errors: fieldErrors(decision.error).reason }}
      />
    </>
  );
}
