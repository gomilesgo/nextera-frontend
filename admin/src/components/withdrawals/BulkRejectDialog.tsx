"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function BulkRejectDialog({
  open,
  pending,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Reject ${count} withdrawal${count === 1 ? "" : "s"}`}
      description="The reason will be visible to the customer for each rejected withdrawal."
      confirmLabel="Reject all"
      pendingLabel="Rejecting…"
      tone="danger"
      pending={pending}
      reason={{ label: "Reason", hint: "At least 5 characters" }}
      onConfirm={onConfirm}
    />
  );
}
