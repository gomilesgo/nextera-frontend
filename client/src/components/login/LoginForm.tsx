"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAction } from "@/app/portal/login/actions";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cx } from "@/lib/cx";
import { initialLoginState } from "@/lib/login";
import { formatIndianMobile } from "@/lib/phone";

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);
  return left;
}

function formatWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function ResendButton({ seconds }: { seconds: number }) {
  const left = useCountdown(seconds);
  return (
    <SubmitButton variant="quiet" size="sm" disabled={left > 0} pendingLabel="Sending…" className="px-3">
      {left > 0 ? (
        <span>
          Resend code in <span className="tnum">{formatWait(left)}</span>
        </span>
      ) : (
        "Resend code"
      )}
    </SubmitButton>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, initialLoginState);

  if (state.step === "code" && state.challengeId) {
    return (
      <div className="grid gap-6">
        {state.notice ? <Notice tone="success">{state.notice}</Notice> : null}
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        <form action={formAction} className="grid gap-6" noValidate>
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="phone" value={state.phone} />
          <input type="hidden" name="challengeId" value={state.challengeId} />
          <input type="hidden" name="next" value={next} />
          <Field name="code" label="6-digit code" error={state.codeError} hint={`Sent to ${formatIndianMobile(state.phone)}. It expires in 5 minutes.`}>
            <TextInput
              key={state.round}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={7}
              required
              autoFocus
              placeholder="••••••"
              invalid={Boolean(state.codeError)}
              hasHint
              className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
            />
          </Field>
          <SubmitButton size="lg" pendingLabel="Verifying…" className="w-full">
            Verify and sign in
          </SubmitButton>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <form action={formAction}>
            <input type="hidden" name="intent" value="change" />
            <input type="hidden" name="phone" value={state.phone} />
            <SubmitButton variant="quiet" size="sm" className="px-3">
              Use a different number
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="intent" value="resend" />
            <input type="hidden" name="phone" value={state.phone} />
            <input type="hidden" name="challengeId" value={state.challengeId} />
            <ResendButton key={state.round} seconds={state.resendInSeconds ?? 0} />
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="intent" value="request" />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <Field name="phone" label="Mobile number" error={state.phoneError} hint="We will text you a 6-digit code to sign in.">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base text-dust"
          >
            +91
          </span>
          <TextInput
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            autoFocus
            maxLength={20}
            placeholder="98765 43210"
            defaultValue={state.phone}
            invalid={Boolean(state.phoneError)}
            hasHint
            aria-label="Mobile number, India +91"
            className={cx("h-14 pl-14 text-lg tnum")}
          />
        </div>
      </Field>
      <SubmitButton size="lg" pendingLabel="Sending code…" className="w-full">
        Send code
      </SubmitButton>
    </form>
  );
}
