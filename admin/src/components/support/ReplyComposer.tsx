"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { TICKET_ATTACHMENT_FIELD, TICKET_LIMITS, staffReplyStatuses } from "@nextera/contracts";
import type { TicketStatus } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea } from "@/components/ui/Field";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import { cx } from "@/lib/cx";
import { formatBytes } from "@/lib/format";
import { ATTACHMENT_ACCEPT, ATTACHMENT_HINT, attachmentError } from "@/lib/support/attachment";
import { ticketStatusLabels } from "@/lib/support/labels";
import { useReplyToTicket } from "@/lib/support/mutations";

export function ReplyComposer({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const reply = useReplyToTicket(ticketId);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const serverErrors = fieldErrors(reply.error);
  const message = actionErrorMessage(reply.error);
  const attachmentErrors = fileError ? [fileError] : serverErrors[TICKET_ATTACHMENT_FIELD];
  const bodyErrors = bodyError ? [bodyError] : serverErrors.body;

  function clearFile() {
    setFile(null);
    setFileError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    if (!chosen) {
      clearFile();
      return;
    }
    const problem = attachmentError(chosen);
    setFileError(problem);
    setFile(problem ? null : chosen);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(null);
    if (!body.trim()) {
      setBodyError("Write a message");
      bodyInput.current?.focus();
      return;
    }
    if (fileError) return;
    setBodyError(null);
    const form = new FormData();
    form.set("body", body);
    form.set("internal", internal ? "true" : "false");
    if (nextStatus) form.set("status", nextStatus);
    if (file) form.set(TICKET_ATTACHMENT_FIELD, file, file.name);
    reply.mutate(form, {
      onSuccess: () => {
        setSent(internal ? "Internal note added." : "Reply sent to the customer.");
        setBody("");
        setNextStatus("");
        clearFile();
        bodyInput.current?.focus();
      },
    });
  }

  const defaultStatus = internal
    ? `Keep as ${ticketStatusLabels[status].toLowerCase()}`
    : `${ticketStatusLabels.pending_customer} (default)`;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={internal ? "Add an internal note" : "Reply to the customer"}
      className={cx(
        "grid gap-3 rounded-[3px] p-4",
        internal ? "border border-dashed border-lagoon/50 bg-lagoon/5" : "hairline bg-horizon/40",
      )}
    >
      <fieldset className="flex flex-wrap gap-1">
        <legend className="sr-only">Message type</legend>
        {[
          { value: false, label: "Reply to customer" },
          { value: true, label: "Internal note" },
        ].map((option) => (
          <label
            key={String(option.value)}
            className={cx(
              "cursor-pointer rounded-[3px] px-3 py-1.5 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
              internal === option.value ? "hairline bg-ink text-parchment" : "text-dust hover:bg-horizon hover:text-parchment",
            )}
          >
            <input
              type="radio"
              name="reply-kind"
              className="sr-only"
              checked={internal === option.value}
              onChange={() => setInternal(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {internal ? <p className="text-xs text-lagoon">Only staff can see internal notes and their attachments.</p> : null}
      <Field name="reply-body" label={internal ? "Note" : "Message"} error={bodyErrors} hint={`${body.length} / ${TICKET_LIMITS.body}`}>
        <TextArea
          ref={bodyInput}
          name="reply-body"
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={TICKET_LIMITS.body}
          required
          invalid={Boolean(bodyErrors?.length)}
          disabled={reply.isPending}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="reply-attachment" label="Attachment (optional)" error={attachmentErrors} hint={file ? `${file.name}, ${formatBytes(file.size)}` : ATTACHMENT_HINT}>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              id="reply-attachment"
              name="reply-attachment"
              type="file"
              accept={ATTACHMENT_ACCEPT}
              onChange={onFile}
              disabled={reply.isPending}
              aria-invalid={attachmentErrors?.length ? true : undefined}
              aria-describedby={attachmentErrors?.length ? "reply-attachment-error" : undefined}
              className="min-w-0 flex-1 text-xs text-dust file:mr-3 file:rounded-[3px] file:border file:border-border file:bg-horizon file:px-2.5 file:py-1 file:text-xs file:text-parchment"
            />
            {file || fileError ? (
              <Button size="sm" variant="ghost" onClick={clearFile} disabled={reply.isPending}>
                Remove
              </Button>
            ) : null}
          </div>
        </Field>
        <Field name="reply-status" label="Status after sending" error={serverErrors.status}>
          <SelectInput name="reply-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} disabled={reply.isPending}>
            <option value="">{defaultStatus}</option>
            {staffReplyStatuses.map((option) => (
              <option key={option} value={option}>
                {ticketStatusLabels[option]}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p aria-live="polite" className={cx("min-h-4 text-xs", message ? "text-ember" : "text-moss")}>
          {reply.isPending ? "" : (message ?? sent ?? "")}
        </p>
        <Button type="submit" disabled={reply.isPending} aria-busy={reply.isPending}>
          {reply.isPending ? "Sending…" : internal ? "Add note" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
