"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminLead } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui/Notice";
import { ActionError, actionErrorMessage } from "@/lib/actions/outcome";
import { useConvertLead } from "@/lib/leads/mutations";

function convertError(error: unknown): string | null {
  const message = actionErrorMessage(error);
  if (error instanceof ActionError && error.code === "customer_inactive") {
    return `${message} Find them under Customers to review their account.`;
  }
  return message;
}

export function ConvertLead({ lead }: { lead: AdminLead }) {
  const convert = useConvertLead(lead.id);
  const [open, setOpen] = useState(false);
  const result = convert.data;

  if (lead.status === "converted") {
    return result ? (
      <div aria-live="polite" tabIndex={-1} ref={(node) => node?.focus()} className="outline-none">
        <Notice tone="success">
          {result.created
            ? "A new customer account was created."
            : "A customer with this mobile already existed, so the lead is linked to them."}{" "}
          <Link href={`/customers/${result.customer.id}`} className="underline hover:text-gold">
            Open {result.customer.name ?? "the customer"}
          </Link>
        </Notice>
      </div>
    ) : null;
  }

  function show() {
    convert.reset();
    setOpen(true);
  }

  return (
    <section aria-labelledby="convert-heading" className="hairline grid gap-3 rounded-[3px] p-4">
      <h2 id="convert-heading" className="text-sm font-medium">
        Convert to customer
      </h2>
      <p className="text-sm text-dust">
        Creates a customer account for <span className="font-mono">{lead.phone}</span>. If a customer already has this
        mobile number, the lead is linked to them instead.
      </p>
      <div>
        <Button onClick={show}>Convert lead</Button>
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => convert.mutate(undefined, { onSuccess: () => setOpen(false) })}
        title={`Convert ${lead.name} to a customer?`}
        description={
          <>
            The lead is marked converted and can no longer change status. The customer signs in to the portal with{" "}
            <span className="font-mono">{lead.phone}</span>.
          </>
        }
        confirmLabel="Convert"
        pendingLabel="Converting…"
        pending={convert.isPending}
        error={convertError(convert.error)}
      />
    </section>
  );
}
