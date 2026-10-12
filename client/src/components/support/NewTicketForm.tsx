"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TICKET_LIMITS, ticketCategories } from "@nextera/contracts";
import { createTicketAction } from "@/app/portal/(app)/support/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { supportKeys } from "@/lib/queries/support";
import { fieldErrorsFrom, mutationNotice, unwrap } from "@/lib/support/client";
import { categoryCopy } from "@/lib/support/copy";
import { SUPPORT_ATTACHMENT_FIELD, validateTicketForm } from "@/lib/support/validation";
import type { TicketFormErrors } from "@/lib/support/validation";
import { AttachmentField } from "./AttachmentField";

export function NewTicketForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const statusRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [attempt, setAttempt] = useState(0);

  const create = useMutation({
    mutationFn: (formData: FormData) => unwrap(createTicketAction(formData)),
    onSuccess: async (data) => {
      queryClient.setQueryData(supportKeys.detail(data.ticket.id), data);
      await queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
      router.push(`/portal/support/${data.ticket.id}`);
    },
    onError: (error) => setErrors(fieldErrorsFrom(error)),
  });

  useEffect(() => {
    if (attempt > 0) statusRef.current?.focus();
  }, [attempt]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    const formData = new FormData(event.currentTarget);
    const validated = validateTicketForm(formData);
    create.reset();
    if (!validated.ok) {
      setErrors(validated.errors);
      setAttempt((count) => count + 1);
      return;
    }
    setErrors({});
    if (!validated.attachment) formData.delete(SUPPORT_ATTACHMENT_FIELD);
    create.mutate(formData, { onError: () => setAttempt((count) => count + 1) });
  }

  const notice = mutationNotice(create.error);
  const errorCount = Object.keys(errors).length;
  const busy = create.isPending || create.isSuccess;

  return (
    <form method="post" onSubmit={submit} noValidate className="grid gap-6" aria-describedby="ticket-status">
      <div id="ticket-status" ref={statusRef} tabIndex={-1} className="outline-none empty:hidden">
        {notice ? (
          <Notice tone="error" title={notice.title}>
            {notice.body}
          </Notice>
        ) : errorCount > 0 ? (
          <Notice tone="error" title="Please check the highlighted fields">
            {errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`}
          </Notice>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr]">
        <Field name="subject" label="Subject" error={errors.subject}>
          <TextInput
            name="subject"
            required
            maxLength={TICKET_LIMITS.subject}
            placeholder="For example, withdrawal not received"
            invalid={Boolean(errors.subject)}
            disabled={busy}
          />
        </Field>
        <Field name="category" label="Topic" error={errors.category}>
          <SelectInput name="category" required defaultValue="" invalid={Boolean(errors.category)} disabled={busy}>
            <option value="" disabled>
              Choose a topic
            </option>
            {ticketCategories.map((category) => (
              <option key={category} value={category}>
                {categoryCopy[category].label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Field
        name="body"
        label="Message"
        error={errors.body}
        hint="Include dates, amounts and any reference numbers. Never share your OTP, PIN or full card number."
      >
        <TextArea
          name="body"
          rows={7}
          required
          maxLength={TICKET_LIMITS.body}
          invalid={Boolean(errors.body)}
          hasHint
          disabled={busy}
        />
      </Field>

      <AttachmentField error={errors.attachment} disabled={busy} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <ButtonLink href="/portal/support" variant="quiet" className="w-full sm:w-auto">
          Cancel
        </ButtonLink>
        <Button type="submit" size="lg" disabled={busy} aria-busy={busy} className="w-full sm:w-auto">
          {busy ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
