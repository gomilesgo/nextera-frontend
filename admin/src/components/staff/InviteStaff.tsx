"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CredentialsReveal } from "@/components/staff/CredentialsReveal";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import { roleLabels } from "@/lib/staff";
import { useInviteStaff } from "@/lib/team/mutations";

export function InviteStaff() {
  const invite = useInviteStaff();
  const [open, setOpen] = useState(false);
  const issued = invite.data;
  const errors = fieldErrors(invite.error);
  const message = actionErrorMessage(invite.error);

  function start() {
    invite.reset();
    setOpen(true);
  }

  function finish() {
    invite.reset();
    setOpen(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invite.mutate(new FormData(event.currentTarget));
  }

  return (
    <>
      <Button onClick={start}>Invite staff</Button>
      <Dialog
        open={open}
        onClose={finish}
        dismissible={!issued && !invite.isPending}
        title={issued ? "Share the new credentials" : "Invite a staff member"}
        description={
          issued ? undefined : "They receive a temporary password and an authenticator key, shown to you once."
        }
        className="w-[min(36rem,calc(100vw-2rem))]"
      >
        {issued ? (
          <CredentialsReveal credentials={issued} purpose="invite" onDone={finish} />
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <Field name="name" label="Name" error={errors.name}>
              <TextInput name="name" required maxLength={80} autoComplete="off" invalid={Boolean(errors.name)} autoFocus />
            </Field>
            <Field name="email" label="Work email" error={errors.email}>
              <TextInput
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="off"
                invalid={Boolean(errors.email)}
              />
            </Field>
            <Field name="role" label="Role" error={errors.role} hint="Support is read-only for customers and plans.">
              <SelectInput name="role" defaultValue="support" invalid={Boolean(errors.role)}>
                <option value="support">{roleLabels.support}</option>
                <option value="ops">{roleLabels.ops}</option>
                <option value="owner">{roleLabels.owner}</option>
              </SelectInput>
            </Field>
            <p aria-live="polite" className="min-h-4 text-xs text-ember">
              {message ?? ""}
            </p>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="ghost" onClick={finish} disabled={invite.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending} aria-busy={invite.isPending}>
                {invite.isPending ? "Inviting…" : "Send invite"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
