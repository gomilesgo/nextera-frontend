"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/(console)/account/password/actions";
import type { PasswordChangeState } from "@/app/(console)/account/password/actions";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { MIN_STAFF_PASSWORD } from "@/lib/account";

const INITIAL_STATE: PasswordChangeState = { status: "idle" };

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, INITIAL_STATE);
  const fields = state.fields ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-4">
      {state.status === "error" && state.message ? <Notice tone="error">{state.message}</Notice> : null}
      <Field name="currentPassword" label="Current password" error={fields.currentPassword}>
        <TextInput
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          invalid={Boolean(fields.currentPassword)}
        />
      </Field>
      <Field
        name="newPassword"
        label="New password"
        error={fields.newPassword}
        hint={`At least ${MIN_STAFF_PASSWORD} characters. A passphrase works well.`}
      >
        <TextInput
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_STAFF_PASSWORD}
          maxLength={200}
          invalid={Boolean(fields.newPassword)}
        />
      </Field>
      <Field name="confirmPassword" label="Confirm new password" error={fields.confirmPassword}>
        <TextInput
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          maxLength={200}
          invalid={Boolean(fields.confirmPassword)}
        />
      </Field>
      <div className="pt-2">
        <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
      </div>
    </form>
  );
}
