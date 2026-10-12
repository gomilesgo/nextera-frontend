"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TicketDetailResponse, TicketStatus } from "@nextera/contracts";
import { TICKET_LIMITS } from "@nextera/contracts";
import { replyTicketAction } from "@/app/portal/(app)/support/actions";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { supportKeys } from "@/lib/queries/support";
import { fieldErrorsFrom, mutationNotice, unwrap } from "@/lib/support/client";
import { SUPPORT_ATTACHMENT_FIELD, validateReplyForm } from "@/lib/support/validation";
import type { TicketFormErrors } from "@/lib/support/validation";
import { AttachmentField } from "./AttachmentField";

export function ReplyComposer({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [sent, setSent] = useState(false);

  const reply = useMutation({
    mutationFn: (formData: FormData) => unwrap(replyTicketAction(ticketId, formData)),
    onSuccess: async (data) => {
      queryClient.setQueryData<TicketDetailResponse>(supportKeys.detail(ticketId), (current) =>
        current
          ? {
              ticket: data.ticket,
              messages: current.messages.some((message) => message.id === data.message.id)
                ? current.messages
                : [...current.messages, data.message],
            }
          : current,
      );
      formRef.current?.reset();
      setResetKey((key) => key + 1);
      setErrors({});
      setSent(true);
      await queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
    },
    onError: (error) => {
      setErrors(fieldErrorsFrom(error));
      setAttempt((count) => count + 1);
      if (error instanceof ApiError && (error.code === "conflict" || error.code === "not_found")) {
        void queryClient.invalidateQueries({ queryKey: supportKeys.detail(ticketId) });
      }
    },
  });

  useEffect(() => {
    if (attempt > 0) statusRef.current?.focus();
  }, [attempt]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reply.isPending) return;
    const formData = new FormData(event.currentTarget);
    const validated = validateReplyForm(formData);
    reply.reset();
    setSent(false);
    if (!validated.ok) {
      setErrors(validated.errors);
      setAttempt((count) => count + 1);
      return;
    }
    setErrors({});
    if (!validated.attachment) formData.delete(SUPPORT_ATTACHMENT_FIELD);
    reply.mutate(formData);
  }

  const notice = mutationNotice(reply.error);
  const errorCount = Object.keys(errors).length;

  return (
    <form ref={formRef} method="post" onSubmit={submit} noValidate className="grid gap-5" aria-labelledby="reply-heading">
      <h2 id="reply-heading" className="font-display text-2xl">
        Reply
      </h2>
      {status === "resolved" ? (
        <p className="-mt-2 text-sm text-dust">Sending a reply will reopen this request.</p>
      ) : null}

      <div ref={statusRef} tabIndex={-1} className="outline-none empty:hidden">
        {notice ? (
          <Notice tone="error" title={notice.title}>
            {notice.body}
          </Notice>
        ) : errorCount > 0 ? (
          <Notice tone="error" title="Please check the highlighted fields">
            {errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`}
          </Notice>
        ) : sent ? (
          <Notice tone="success">Your reply has been sent.</Notice>
        ) : null}
      </div>

      <Field name="body" label="Message" error={errors.body}>
        <TextArea
          name="body"
          rows={5}
          required
          maxLength={TICKET_LIMITS.body}
          invalid={Boolean(errors.body)}
          disabled={reply.isPending}
          onChange={() => setSent(false)}
        />
      </Field>

      <AttachmentField key={resetKey} error={errors.attachment} disabled={reply.isPending} />

      <div className="flex justify-end">
        <Button type="submit" disabled={reply.isPending} aria-busy={reply.isPending} className="w-full sm:w-auto">
          {reply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
