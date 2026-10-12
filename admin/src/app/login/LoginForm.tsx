"use client";

import { useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "@/app/login/actions";
import type { LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";

const INITIAL_STATE: LoginState = { status: "idle" };

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE);
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.clear();
  }, [queryClient]);
  const fields = state.fields ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-4">
      {state.status === "error" && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : notice ? (
        <Notice>{notice}</Notice>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <Field name="email" label="Email" error={fields.email}>
        <TextInput
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state.email ?? ""}
          invalid={Boolean(fields.email)}
        />
      </Field>
      <Field name="password" label="Password" error={fields.password}>
        <TextInput
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          invalid={Boolean(fields.password)}
        />
      </Field>
      <Field name="totp" label="Authenticator code" error={fields.totp}>
        <TextInput
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="000000"
          className="font-mono tracking-[0.4em]"
          invalid={Boolean(fields.totp)}
        />
      </Field>
      <Button type="submit" disabled={pending} aria-busy={pending} className="mt-2 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
