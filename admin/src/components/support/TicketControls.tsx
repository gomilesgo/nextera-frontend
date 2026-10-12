"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { staffReplyStatuses, ticketPriorities } from "@nextera/contracts";
import type { AdminTicketSummary } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, SelectInput } from "@/components/ui/Field";
import { actionErrorMessage } from "@/lib/actions/outcome";
import { cx } from "@/lib/cx";
import type { TicketPatchInput } from "@/lib/support/reply";
import { ticketPriorityLabels, ticketStatusLabels } from "@/lib/support/labels";
import { useCloseTicket, useUpdateTicket } from "@/lib/support/mutations";
import { useAssignees } from "@/lib/useAssignees";

function useSynced(source: string): [string, (next: string) => void] {
  const [value, setValue] = useState(source);
  const [seen, setSeen] = useState(source);
  if (seen !== source) {
    setSeen(source);
    setValue(source);
  }
  return [value, setValue];
}

function Outcome({ error, done, pending }: { error: unknown; done: string | null; pending: boolean }) {
  const message = actionErrorMessage(error);
  return (
    <p aria-live="polite" className={cx("min-h-4 text-xs", message ? "text-ember" : "text-moss")}>
      {pending ? "" : (message ?? done ?? "")}
    </p>
  );
}

function SelectForm({
  name,
  label,
  current,
  toPatch,
  ticketId,
  savedLabel,
  children,
  extra,
}: {
  name: string;
  label: string;
  current: string;
  toPatch: (value: string) => TicketPatchInput;
  ticketId: string;
  savedLabel: string;
  children: ReactNode;
  extra?: (save: (value: string) => void, pending: boolean) => ReactNode;
}) {
  const update = useUpdateTicket(ticketId);
  const [value, setValue] = useSynced(current);

  function save(next: string) {
    setValue(next);
    update.mutate(toPatch(next));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value !== current) save(value);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2">
      <Field name={name} label={label}>
        <SelectInput name={name} value={value} onChange={(event) => setValue(event.target.value)} disabled={update.isPending}>
          {children}
        </SelectInput>
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Outcome error={update.error} done={update.isSuccess ? savedLabel : null} pending={update.isPending} />
        <div className="flex gap-2">
          {extra?.(save, update.isPending)}
          <Button type="submit" size="sm" variant="secondary" disabled={update.isPending || value === current} aria-busy={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CloseTicket({ ticket }: { ticket: AdminTicketSummary }) {
  const close = useCloseTicket(ticket.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-2 border-t border-border pt-3">
      <Button
        variant="danger"
        onClick={() => {
          close.reset();
          setOpen(true);
        }}
      >
        Close ticket
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          close.mutate(undefined, {
            onSuccess: () => {
              setOpen(false);
              requestAnimationFrame(() => document.getElementById("ticket-status")?.focus());
            },
          })
        }
        title={`Close ${ticket.ref}?`}
        description="The customer can no longer reply to a closed ticket. Staff can reopen it by changing its status."
        confirmLabel="Close ticket"
        pendingLabel="Closing…"
        tone="danger"
        pending={close.isPending}
        error={actionErrorMessage(close.error)}
      />
    </div>
  );
}

export function TicketControls({ ticket }: { ticket: AdminTicketSummary }) {
  const { me, options } = useAssignees(ticket.assignee);
  const closed = ticket.status === "closed";
  const assignee = ticket.assignee?.id ?? "";

  return (
    <section aria-labelledby="ticket-controls" className="hairline grid gap-4 rounded-[3px] p-4">
      <h2 id="ticket-controls" className="text-sm font-medium">
        Ticket
      </h2>
      <SelectForm
        ticketId={ticket.id}
        name="ticket-assignee"
        label="Assigned to"
        current={assignee}
        toPatch={(value) => ({ assigneeId: value || null })}
        savedLabel="Assignment saved."
        extra={(save, pending) =>
          me && assignee !== me.id ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => save(me.id)}>
              Assign to me
            </Button>
          ) : null
        }
      >
        <option value="">Unassigned</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </SelectForm>
      <SelectForm
        ticketId={ticket.id}
        name="ticket-status"
        label={closed ? "Reopen as" : "Status"}
        current={closed ? "" : ticket.status}
        toPatch={(value) => ({ status: value })}
        savedLabel={closed ? "Ticket reopened." : "Status saved."}
      >
        {closed ? <option value="">Closed</option> : null}
        {staffReplyStatuses.map((status) => (
          <option key={status} value={status}>
            {ticketStatusLabels[status]}
          </option>
        ))}
      </SelectForm>
      <SelectForm
        ticketId={ticket.id}
        name="ticket-priority"
        label="Priority"
        current={ticket.priority}
        toPatch={(value) => ({ priority: value })}
        savedLabel="Priority saved."
      >
        {ticketPriorities.map((priority) => (
          <option key={priority} value={priority}>
            {ticketPriorityLabels[priority]}
          </option>
        ))}
      </SelectForm>
      {closed ? null : <CloseTicket ticket={ticket} />}
    </section>
  );
}
