"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TicketDetailResponse } from "@nextera/contracts";
import { closeTicketAction } from "@/app/portal/(app)/support/actions";
import { Button } from "@/components/ui/Button";
import { supportKeys } from "@/lib/queries/support";
import { mutationNotice, unwrap } from "@/lib/support/client";

export function CloseTicketControl({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const close = useMutation({
    mutationFn: () => unwrap(closeTicketAction(ticketId)),
    onSuccess: async (data) => {
      queryClient.setQueryData<TicketDetailResponse>(supportKeys.detail(ticketId), (current) =>
        current ? { ...current, ticket: data.ticket } : current,
      );
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: supportKeys.all() });
    },
  });

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  function cancel() {
    setConfirming(false);
    close.reset();
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  const notice = mutationNotice(close.error);

  if (!confirming) {
    return (
      <Button ref={openerRef} variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Close request
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !close.isPending) cancel();
      }}
      className="grid gap-4 rounded-[2px] border border-ember/40 bg-ember/[0.06] p-4 sm:p-5"
    >
      <div>
        <p id={titleId} className="font-medium text-parchment">
          Close this request?
        </p>
        <p id={bodyId} className="mt-1 text-sm text-parchment/75">
          You will not be able to reply once it is closed. If you need more help later, start a new request.
        </p>
      </div>
      {notice ? (
        <p role="alert" className="text-sm text-ember">
          {notice.body}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="quiet" size="sm" onClick={cancel} disabled={close.isPending}>
          Keep it open
        </Button>
        <Button
          ref={confirmRef}
          variant="danger"
          size="sm"
          onClick={() => close.mutate()}
          disabled={close.isPending}
          aria-busy={close.isPending}
        >
          {close.isPending ? "Closing…" : "Yes, close it"}
        </Button>
      </div>
    </div>
  );
}
