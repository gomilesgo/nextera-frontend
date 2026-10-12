"use server";

import type { Withdrawal } from "@nextera/contracts";
import { actionFailure, portalCall, unexpectedResponse } from "@/lib/portalAction";
import type { ActionFailure } from "@/lib/actionResult";

export type WithdrawalResult = { status: "ok"; withdrawal: Withdrawal; replayed: boolean } | ActionFailure;

export type CancelWithdrawalResult = { status: "ok"; withdrawal: Withdrawal } | ActionFailure;

const WITHDRAWAL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toWithdrawal(raw: unknown): Withdrawal | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.id !== "string" || typeof d.amountPaise !== "number" || typeof d.status !== "string") return null;
  return raw as Withdrawal;
}

const createCopy: Record<string, string> = {
  insufficient_funds: "Your withdrawable balance is not enough for this amount.",
  bank_account_required: "Add and verify a bank account before requesting a withdrawal.",
  bank_account_changed: "Your primary bank account changed. Please confirm the details and try again.",
  payment_preparing: "A payment is being prepared for your account. Please wait a moment and try again.",
  conflict: "You have too many open withdrawal requests. Cancel one before creating another.",
  payout_on_hold: "Payouts for your account are on hold. Please contact support.",
  account_blocked: "Your account is not active. Please contact support.",
};

const cancelCopy: Record<string, string> = {
  not_found: "This withdrawal could not be found.",
  conflict: "This withdrawal can no longer be cancelled.",
};

export async function requestWithdrawalAction(
  amountPaise: number,
  idempotencyKey: string,
): Promise<WithdrawalResult> {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return { status: "error", httpStatus: 400, code: "validation", message: "Enter a valid amount." };
  }

  const result = await portalCall<unknown>(
    "/v1/withdrawals",
    {
      method: "POST",
      json: { amountPaise },
      headers: { "idempotency-key": idempotencyKey },
    },
    "wallet.withdraw",
  );

  if (!result.ok) return actionFailure("wallet.withdraw", result, createCopy);

  const data = result.data as { withdrawal?: unknown; replayed?: boolean };
  const withdrawal = toWithdrawal(data?.withdrawal);
  return withdrawal
    ? { status: "ok", withdrawal, replayed: Boolean(data?.replayed) }
    : unexpectedResponse("wallet.withdraw");
}

export async function cancelWithdrawalAction(withdrawalId: string): Promise<CancelWithdrawalResult> {
  if (!WITHDRAWAL_ID.test(withdrawalId)) {
    return { status: "error", httpStatus: 404, code: "not_found", message: cancelCopy.not_found };
  }

  const result = await portalCall<unknown>(
    `/v1/withdrawals/${withdrawalId}/cancel`,
    { method: "POST" },
    "wallet.cancel",
  );

  if (!result.ok) return actionFailure("wallet.cancel", result, cancelCopy);

  const data = result.data as { withdrawal?: unknown };
  const withdrawal = toWithdrawal(data?.withdrawal);
  return withdrawal ? { status: "ok", withdrawal } : unexpectedResponse("wallet.cancel");
}
