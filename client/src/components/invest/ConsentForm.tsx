"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestConsentAction, verifyConsentAction } from "@/app/portal/(app)/invest/actions";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { throwOnAuthLoss } from "@/lib/investClient";
import { maskIndianMobile } from "@/lib/phone";
import { queryKeys } from "@/lib/queries/keys";
import { deadlineIn, formatClock, useSecondsUntil } from "./useSecondsUntil";
import type { Deadline } from "./useSecondsUntil";

type Challenge = { challengeId: string; expires: Deadline };

type Message = { tone: "error" | "info" | "success"; text: string };

export function ConsentForm({
  investmentId,
  phone,
  ready,
  onAccepted,
}: {
  investmentId: string;
  phone: string | null;
  ready: boolean;
  onAccepted: () => void;
}) {
  const queryClient = useQueryClient();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [resendAt, setResendAt] = useState<Deadline | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const resendIn = useSecondsUntil(resendAt);
  const expiresIn = useSecondsUntil(challenge?.expires ?? null);
  const expired = challenge !== null && expiresIn === 0;

  const refreshInvestment = () => queryClient.invalidateQueries({ queryKey: queryKeys.investments.detail(investmentId) });

  const request = useMutation({
    mutationFn: async () => throwOnAuthLoss(await requestConsentAction({ investmentId })),
    onMutate: () => setMessage(null),
    onSuccess: (result) => {
      if (result.ok) {
        setChallenge({ challengeId: result.challengeId, expires: deadlineIn(result.expiresInSeconds) });
        setResendAt(deadlineIn(result.resendAfterSeconds));
        setCode("");
        setCodeError(null);
        setMessage({
          tone: "success",
          text: phone ? `We sent a 6-digit code to ${maskIndianMobile(phone)}.` : "We sent a 6-digit code to your mobile number.",
        });
        window.setTimeout(() => codeRef.current?.focus(), 0);
        return;
      }
      if (result.code === "rate_limited" && result.retryAfterSeconds) {
        setResendAt(deadlineIn(result.retryAfterSeconds));
      }
      if (result.code === "conflict" || result.code === "not_found") void refreshInvestment();
      setMessage({ tone: "error", text: result.message });
    },
    onError: () => setMessage({ tone: "error", text: "Something went wrong. Please try again." }),
  });

  const verify = useMutation({
    mutationFn: async (input: { challengeId: string; code: string }) =>
      throwOnAuthLoss(await verifyConsentAction({ investmentId, ...input })),
    onMutate: () => {
      setMessage(null);
      setCodeError(null);
    },
    onSuccess: async (result) => {
      if (result.ok) {
        setMessage({ tone: "success", text: "Agreement accepted. You can now pay." });
        await queryClient.invalidateQueries({ queryKey: queryKeys.investments.all() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() });
        onAccepted();
        return;
      }
      if (result.field === "code") {
        setCodeError(result.message);
        codeRef.current?.focus();
        return;
      }
      if (result.code === "otp_expired" || result.code === "otp_exhausted") {
        setChallenge(null);
        setResendAt(null);
        setCode("");
      }
      if (result.code === "conflict") void refreshInvestment();
      setMessage({ tone: "error", text: result.message });
    },
    onError: () => setMessage({ tone: "error", text: "Something went wrong. Please try again." }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || verify.isPending) return;
    const digits = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(digits)) {
      setCodeError("Enter the 6-digit code from the SMS.");
      codeRef.current?.focus();
      return;
    }
    verify.mutate({ challengeId: challenge.challengeId, code: digits });
  }

  const busy = request.isPending || verify.isPending;

  return (
    <div className="grid gap-5">
      <div aria-live="polite" aria-atomic="true">
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      </div>

      {challenge && !expired ? (
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <Field
            name="consent-code"
            label="6-digit code"
            error={codeError ?? undefined}
            hint={
              <>
                Code expires in <span className="tnum">{formatClock(expiresIn)}</span>. Entering it confirms that you accept the
                agreement.
              </>
            }
          >
            <TextInput
              ref={codeRef}
              name="consent-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={7}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              invalid={Boolean(codeError)}
              hasHint
              placeholder="••••••"
              className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={verify.isPending}>
            {verify.isPending ? "Confirming…" : "Accept agreement"}
          </Button>
        </form>
      ) : null}

      {challenge && expired ? (
        <Notice tone="info">This code has expired. Request a new one to continue.</Notice>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant={challenge ? "quiet" : "gold"}
          size={challenge ? "sm" : "lg"}
          className={challenge ? "px-3" : "w-full sm:w-auto"}
          onClick={() => request.mutate()}
          disabled={!ready || busy || resendIn > 0}
          aria-busy={request.isPending}
          aria-describedby={ready ? undefined : "consent-ready-hint"}
        >
          {request.isPending ? (
            "Sending code…"
          ) : resendIn > 0 ? (
            <span>
              {challenge ? "Resend code" : "Send code"} in <span className="tnum">{formatClock(resendIn)}</span>
            </span>
          ) : challenge ? (
            "Resend code"
          ) : (
            "Send me the code"
          )}
        </Button>
        {!ready ? (
          <p id="consent-ready-hint" className="text-xs text-dust">
            Confirm that you have read the agreement first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
