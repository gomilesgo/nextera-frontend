"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { LEAD_NOTES_MAX, editableLeadStatuses } from "@nextera/contracts";
import type { AdminLead } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea } from "@/components/ui/Field";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import { useUpdateLead } from "@/lib/leads/mutations";
import { leadStatusLabels } from "@/lib/leads/labels";
import { useAssignees } from "@/lib/useAssignees";

function useSynced<T>(source: T): [T, (next: T) => void] {
  const [value, setValue] = useState(source);
  const [seen, setSeen] = useState(source);
  if (seen !== source) {
    setSeen(source);
    setValue(source);
  }
  return [value, setValue];
}

function Panel({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="hairline grid gap-3 rounded-[3px] p-4">
      <h2 id={id} className="text-sm font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Status({ message, done, pending }: { message: string | null; done: string | null; pending: boolean }) {
  return (
    <p aria-live="polite" className={message ? "min-h-4 text-xs text-ember" : "min-h-4 text-xs text-moss"}>
      {pending ? "" : (message ?? done ?? "")}
    </p>
  );
}

function StatusForm({ lead }: { lead: AdminLead }) {
  const update = useUpdateLead(lead.id);
  const [value, setValue] = useSynced<string>(lead.status);
  const converted = lead.status === "converted";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === lead.status) return;
    update.mutate({ status: value });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2">
      <Field name="lead-status" label="Status" error={fieldErrors(update.error).status}>
        <SelectInput
          name="lead-status"
          value={converted ? "converted" : value}
          onChange={(event) => setValue(event.target.value)}
          disabled={converted || update.isPending}
        >
          {converted ? <option value="converted">{leadStatusLabels.converted}</option> : null}
          {editableLeadStatuses.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabels[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      {converted ? (
        <p className="text-xs text-dust">A converted lead keeps its status.</p>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Status message={actionErrorMessage(update.error)} done={update.isSuccess ? "Status saved." : null} pending={update.isPending} />
          <Button type="submit" size="sm" variant="secondary" disabled={update.isPending || value === lead.status} aria-busy={update.isPending}>
            {update.isPending ? "Saving…" : "Save status"}
          </Button>
        </div>
      )}
    </form>
  );
}

function AssigneeForm({ lead }: { lead: AdminLead }) {
  const update = useUpdateLead(lead.id);
  const { me, options } = useAssignees(lead.assignee);
  const current = lead.assignee?.id ?? "";
  const [value, setValue] = useSynced(current);

  function save(next: string) {
    update.mutate({ assigneeId: next || null });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value !== current) save(value);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2">
      <Field name="lead-assignee" label="Assigned to" error={fieldErrors(update.error).assigneeId}>
        <SelectInput name="lead-assignee" value={value} onChange={(event) => setValue(event.target.value)} disabled={update.isPending}>
          <option value="">Unassigned</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Status message={actionErrorMessage(update.error)} done={update.isSuccess ? "Assignment saved." : null} pending={update.isPending} />
        <div className="flex gap-2">
          {me && current !== me.id ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => {
                setValue(me.id);
                save(me.id);
              }}
            >
              Assign to me
            </Button>
          ) : null}
          <Button type="submit" size="sm" variant="secondary" disabled={update.isPending || value === current} aria-busy={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function NotesForm({ lead }: { lead: AdminLead }) {
  const update = useUpdateLead(lead.id);
  const [value, setValue] = useSynced(lead.notes ?? "");
  const unchanged = value.trim() === (lead.notes ?? "");
  const errors = fieldErrors(update.error).notes;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unchanged) update.mutate({ notes: value });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2">
      <Field name="lead-notes" label="Notes" error={errors} hint={`${value.length} / ${LEAD_NOTES_MAX}`}>
        <TextArea
          name="lead-notes"
          rows={5}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={LEAD_NOTES_MAX}
          invalid={Boolean(errors)}
          disabled={update.isPending}
        />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <Status message={actionErrorMessage(update.error)} done={update.isSuccess ? "Notes saved." : null} pending={update.isPending} />
        <Button type="submit" size="sm" variant="secondary" disabled={update.isPending || unchanged} aria-busy={update.isPending}>
          {update.isPending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </form>
  );
}

export function LeadWorkflow({ lead }: { lead: AdminLead }) {
  return (
    <Panel title="Follow-up" id="lead-follow-up">
      <StatusForm lead={lead} />
      <AssigneeForm lead={lead} />
      <NotesForm lead={lead} />
    </Panel>
  );
}
