import type { WalletResponse, WalletTransactionPage, Withdrawal } from "@nextera/contracts";
import type { BackendRequest, BackendResult } from "@/lib/backend/client";
import { toBankAccounts } from "@/lib/bank";
import { toCustomerProfile } from "@/lib/customer";
import { toKycResponse, toPortalKyc } from "@/lib/kyc";
import { toActivePlans, toPlan } from "@/lib/plans";
import { GENERIC_MESSAGES, logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";
import { SESSION_COOKIE } from "@/lib/sessionCookie";
import { errorResponse, fromBackend, unauthorizedError } from "./respond";

function isWalletResponse(data: unknown): data is WalletResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.walletBalancePaise === "number" &&
    typeof d.withdrawalHoldPaise === "number" &&
    typeof d.withdrawablePaise === "number" &&
    typeof d.minWithdrawalPaise === "number"
  );
}

function toWithdrawal(raw: unknown): Withdrawal | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (
    typeof d.id !== "string" ||
    typeof d.amountPaise !== "number" ||
    typeof d.status !== "string" ||
    typeof d.requestedAt !== "string"
  )
    return null;
  return raw as Withdrawal;
}

function toWithdrawals(data: unknown): { withdrawals: Withdrawal[]; nextCursor: string | null } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.withdrawals)) return null;
  const withdrawals = d.withdrawals.map(toWithdrawal).filter((w): w is Withdrawal => w !== null);
  return {
    withdrawals,
    nextCursor: typeof d.nextCursor === "string" ? d.nextCursor : null,
  };
}

function toWalletTransactionPage(data: unknown): WalletTransactionPage | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.transactions)) return null;
  return {
    transactions: d.transactions.filter(
      (t): t is WalletTransactionPage["transactions"][number] =>
        t !== null && typeof t === "object" && typeof (t as Record<string, unknown>).id === "string",
    ),
    nextCursor: typeof d.nextCursor === "string" ? d.nextCursor : null,
  };
}

export type HandlerDeps = {
  token: string | null;
  call: <T>(path: string, init?: Omit<BackendRequest, "ip" | "userAgent" | "revalidateSeconds">) => Promise<BackendResult<T>>;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function withClearedSession(response: Response): Response {
  if (response.status === 401) response.headers.append("set-cookie", clearSessionCookieHeader());
  return response;
}

function signedOut(): Response {
  return withClearedSession(errorResponse(unauthorizedError, 401));
}

async function authedCall<T>(deps: HandlerDeps & { token: string }, path: string, context: string) {
  const result = await deps.call<T>(path, { token: deps.token });
  if (!result.ok && result.error.code === "unauthorized" && (await serviceKeyRejected((ping) => deps.call(ping)))) {
    logServiceKeyRejected(context);
    return errorResponse({ code: "unavailable", message: GENERIC_MESSAGES.misconfigured }, 503);
  }
  return result;
}

export async function meHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await authedCall<{ customer?: unknown }>({ ...deps, token: deps.token }, "/v1/auth/me", "api/me");
  if (result instanceof Response) return result;
  return withClearedSession(
    fromBackend(result, (data) => {
      const customer = toCustomerProfile(data?.customer);
      return customer ? { customer } : null;
    }),
  );
}

export async function kycHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await authedCall<unknown>({ ...deps, token: deps.token }, "/v1/kyc", "api/kyc");
  if (result instanceof Response) return result;
  return withClearedSession(fromBackend(result, (data) => {
      const kyc = toKycResponse(data);
      return kyc ? toPortalKyc(kyc) : null;
    }));
}

export async function bankAccountsHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await authedCall<unknown>({ ...deps, token: deps.token }, "/v1/bank-accounts", "api/bank-accounts");
  if (result instanceof Response) return result;
  return withClearedSession(
    fromBackend(result, (data) => {
      const accounts = toBankAccounts(data);
      return accounts ? { accounts } : null;
    }),
  );
}

export async function plansHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await deps.call<unknown>("/v1/plans");
  return fromBackend(result, (data) => ({ plans: toActivePlans(data) }));
}

export async function planHandler(deps: HandlerDeps, slug: string): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!SLUG.test(slug) || slug.length > 60) {
    return errorResponse({ code: "not_found", message: "Plan not found" }, 404);
  }
  const result = await deps.call<{ plan?: unknown }>(`/v1/plans/${encodeURIComponent(slug)}`);
  return fromBackend(result, (data) => {
    const plan = toPlan(data?.plan);
    return plan && plan.status === "active" ? { plan } : null;
  });
}

export async function walletHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await authedCall<unknown>({ ...deps, token: deps.token }, "/v1/wallet", "api/wallet");
  if (result instanceof Response) return result;
  return withClearedSession(fromBackend(result, (data) => (isWalletResponse(data) ? data : null)));
}

export async function withdrawalsHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await authedCall<unknown>({ ...deps, token: deps.token }, "/v1/withdrawals", "api/wallet/withdrawals");
  if (result instanceof Response) return result;
  return withClearedSession(fromBackend(result, toWithdrawals));
}

export async function walletTransactionsHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await authedCall<unknown>(
    { ...deps, token: deps.token },
    "/v1/wallet/transactions",
    "api/wallet/transactions",
  );
  if (result instanceof Response) return result;
  return withClearedSession(fromBackend(result, toWalletTransactionPage));
}
