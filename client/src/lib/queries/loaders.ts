import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { WalletResponse } from "@nextera/contracts";
import { toBankAccounts } from "@/lib/bank";
import { getPortalPlan, getPortalPlans } from "@/lib/backend/plans";
import { callBackend } from "@/lib/backend/server";
import type { BackendResult } from "@/lib/backend/client";
import { toKycResponse, toPortalKyc } from "@/lib/kyc";
import { safePortalPath } from "@/lib/request";
import { logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";
import { PATH_HEADER, expiredPath } from "@/lib/sessionCookie";
import type { BankAccountsData, KycData, PlanData, PlansData, WalletData } from "./options";

export async function loadPlans(): Promise<PlansData> {
  const result = await getPortalPlans();
  if (result.status !== "ok") throw new Error("Plans are unavailable");
  return { plans: result.plans };
}

export async function loadPlan(slug: string): Promise<PlanData | null> {
  const result = await getPortalPlan(slug);
  if (result.status === "not_found") return null;
  if (result.status !== "ok") throw new Error("Plan is unavailable");
  return { plan: result.plan };
}

export async function expireOnUnauthorized(result: BackendResult<unknown>, context: string): Promise<void> {
  if (result.ok) return;
  if (result.error.code === "account_blocked") redirect(expiredPath("blocked"));
  if (result.error.code !== "unauthorized") return;
  if (await serviceKeyRejected((path) => callBackend(path))) {
    logServiceKeyRejected(context);
    return;
  }
  const current = (await headers()).get(PATH_HEADER);
  redirect(expiredPath("session", current ? safePortalPath(current) : undefined));
}

export async function loadKyc(token: string): Promise<KycData> {
  const result = await callBackend<unknown>("/v1/kyc", { token });
  await expireOnUnauthorized(result, "loader.kyc");
  if (!result.ok) throw new Error(`KYC is unavailable (${result.status}:${result.error.code})`);
  const kyc = toKycResponse(result.data);
  if (!kyc) throw new Error("KYC response was malformed");
  return toPortalKyc(kyc);
}

export async function loadBankAccounts(token: string): Promise<BankAccountsData> {
  const result = await callBackend<unknown>("/v1/bank-accounts", { token });
  await expireOnUnauthorized(result, "loader.bank");
  if (!result.ok) throw new Error(`Bank accounts are unavailable (${result.status}:${result.error.code})`);
  const accounts = toBankAccounts(result.data);
  if (!accounts) throw new Error("Bank accounts response was malformed");
  return { accounts };
}

export async function loadWallet(token: string): Promise<WalletData> {
  const result = await callBackend<WalletResponse>("/v1/wallet", { token });
  await expireOnUnauthorized(result, "loader.wallet");
  if (!result.ok) throw new Error(`Wallet is unavailable (${result.status}:${result.error.code})`);
  return result.data;
}
