"use server";

import type { BankAccount } from "@nextera/contracts";
import { fieldArrays, invalidFields, waitText } from "@/lib/actionResult";
import type { ActionFailure } from "@/lib/actionResult";
import { BANK_ACCOUNT_ID, BANK_DAILY_ATTEMPTS, mapBankFields, readBankForm, toBankAccount, validateBank } from "@/lib/bank";
import { actionFailure, portalCall, unexpectedResponse } from "@/lib/portalAction";

export type BankAccountResult = { status: "ok"; account: BankAccount } | ActionFailure;

const addCopy = {
  kyc_not_verified: "Your KYC must be verified before you can add a bank account.",
  bank_account_invalid:
    "We could not verify this account with your bank. Check the account number and IFSC, then try again. Each attempt counts toward today's limit.",
  provider_unavailable: "The bank verification service is not responding. Please try again in a few minutes.",
  conflict: "This bank account is already on your profile or is being verified.",
};

const primaryCopy = {
  not_found: "We could not find that bank account. Refresh the page and try again.",
  conflict: "Only a verified bank account can be your primary account.",
};

function account(data: unknown): BankAccount | null {
  return data && typeof data === "object" ? toBankAccount((data as { account?: unknown }).account) : null;
}

export async function addBankAccountAction(formData: FormData): Promise<BankAccountResult> {
  const validation = validateBank(readBankForm(formData));
  if (!validation.ok) return invalidFields(validation.errors);

  const result = await portalCall<unknown>("/v1/bank-accounts", { method: "POST", json: validation.payload }, "bank");
  if (!result.ok) {
    const { error } = result;
    const fields = error.code === "validation" ? fieldArrays(mapBankFields(error.fields)) : undefined;
    const limited = `You have used all ${BANK_DAILY_ATTEMPTS} verification attempts for the last 24 hours. ${waitText(error.retryAfterSeconds)}`;
    return actionFailure("bank", result, { ...addCopy, rate_limited: limited }, fields);
  }

  const added = account(result.data);
  return added ? { status: "ok", account: added } : unexpectedResponse("bank");
}

export async function setPrimaryBankAccountAction(accountId: string): Promise<BankAccountResult> {
  if (typeof accountId !== "string" || !BANK_ACCOUNT_ID.test(accountId)) {
    return { status: "error", httpStatus: 404, code: "not_found", message: primaryCopy.not_found };
  }

  const result = await portalCall<unknown>(`/v1/bank-accounts/${accountId}/primary`, { method: "POST" }, "bank.primary");
  if (!result.ok) return actionFailure("bank.primary", result, primaryCopy);

  const updated = account(result.data);
  return updated ? { status: "ok", account: updated } : unexpectedResponse("bank.primary");
}

export type RemoveBankAccountResult = { status: "ok" } | ActionFailure;

const removeCopy = {
  not_found: "We could not find that bank account. Refresh the page and try again.",
  conflict:
    "This account has an open withdrawal request or is the last verified account. Cancel the withdrawal or add another verified account first.",
};

export async function removeBankAccountAction(accountId: string): Promise<RemoveBankAccountResult> {
  if (typeof accountId !== "string" || !BANK_ACCOUNT_ID.test(accountId)) {
    return { status: "error", httpStatus: 404, code: "not_found", message: removeCopy.not_found };
  }

  const result = await portalCall<unknown>(`/v1/bank-accounts/${accountId}`, { method: "DELETE" }, "bank.remove");
  if (!result.ok) return actionFailure("bank.remove", result, removeCopy);

  return { status: "ok" };
}
