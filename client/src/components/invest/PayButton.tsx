"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { startPaymentAction } from "@/app/portal/(app)/invest/actions";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { openCashfreeCheckout } from "@/lib/cashfree";
import type { CheckoutOutcome } from "@/lib/cashfree";
import { throwOnAuthLoss } from "@/lib/investClient";
import { INVEST_MESSAGES } from "@/lib/invest";
import type { InvestFailure } from "@/lib/invest";
import { investmentQuery } from "@/lib/queries/investments";
import { queryKeys } from "@/lib/queries/keys";

type PayOutcome = { kind: "checkout"; outcome: CheckoutOutcome } | { kind: "failed"; failure: InvestFailure } | { kind: "sdk" };

const CLOSED_MESSAGE =
  "The payment window was closed before the payment finished. You can try again. If money left your account, do not pay again: check the payment status instead.";
const SDK_MESSAGE = "We could not load the secure Cashfree checkout. Reload the page and try again.";

export function PayButton({
  investmentId,
  amountPaise,
  label,
  variant = "gold",
  onStatusPage = false,
  onStarted,
}: {
  investmentId: string;
  amountPaise: number;
  label?: string;
  variant?: "gold" | "ghost";
  onStatusPage?: boolean;
  onStarted?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const statusPath = `/portal/invest/${investmentId}/status`;

  const pay = useMutation({
    mutationFn: async (): Promise<PayOutcome> => {
      const result = throwOnAuthLoss(await startPaymentAction({ investmentId }));
      if (!result.ok) {
        if (result.code !== "conflict") return { kind: "failed", failure: result };
        await queryClient.invalidateQueries({ queryKey: queryKeys.investments.detail(investmentId) });
        const fresh = await queryClient.fetchQuery({ ...investmentQuery(investmentId), staleTime: 0 }).catch(() => null);
        const preparing = fresh?.investment.status === "pending_payment" && Boolean(fresh.investment.consentedAt);
        return { kind: "failed", failure: { ...result, message: preparing ? INVEST_MESSAGES.preparing : INVEST_MESSAGES.notAwaitingPayment } };
      }
      onStarted?.();
      try {
        return { kind: "checkout", outcome: await openCashfreeCheckout(result.paymentSessionId, result.mode) };
      } catch {
        return { kind: "sdk" };
      }
    },
    onMutate: () => setMessage(null),
    onSuccess: async (outcome) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.investments.all() });
      if (outcome.kind === "failed") {
        setMessage({ tone: "error", text: outcome.failure.message });
        return;
      }
      if (outcome.kind === "sdk") {
        setMessage({ tone: "error", text: SDK_MESSAGE });
        return;
      }
      if (outcome.outcome === "completed") {
        if (onStatusPage) {
          setMessage({ tone: "info", text: "Checking your payment with Cashfree…" });
        } else {
          router.push(statusPath);
        }
        return;
      }
      if (outcome.outcome === "closed") setMessage({ tone: "info", text: CLOSED_MESSAGE });
    },
    onError: () => setMessage({ tone: "error", text: "Something went wrong. Please try again." }),
  });

  return (
    <div className="grid gap-4">
      <Button
        size="lg"
        variant={variant}
        className="w-full sm:w-auto"
        onClick={() => pay.mutate()}
        disabled={pay.isPending}
        aria-busy={pay.isPending}
      >
        {pay.isPending ? "Opening secure checkout…" : (label ?? `Pay ${formatPaise(amountPaise)}`)}
      </Button>
      <div aria-live="polite">
        {message ? (
          <Notice tone={message.tone}>
            <span className="block">{message.text}</span>
            {message.tone === "info" && !onStatusPage ? (
              <Link href={statusPath} className="mt-2 inline-block text-lagoon underline">
                Check payment status
              </Link>
            ) : null}
          </Notice>
        ) : null}
      </div>
    </div>
  );
}
