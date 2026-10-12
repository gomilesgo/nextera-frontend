"use server";

import { callBackend } from "@/lib/backend/server";
import { getPortalPlan } from "@/lib/backend/plans";
import {
  createIntent,
  parseCashfreeMode,
  requestConsent,
  startPayment,
  verifyConsent,
} from "@/lib/invest";
import type {
  ConsentRequestResult,
  ConsentVerifyResult,
  CreateIntentResult,
  InvestFailure,
  PostJson,
  StartPaymentResult,
} from "@/lib/invest";
import { INVEST_MESSAGES } from "@/lib/invest";
import { serviceKeyRejected } from "@/lib/safeErrors";
import { clearSession, readSessionToken } from "@/lib/session";

const signedOut: InvestFailure = { ok: false, code: "signed_out", message: INVEST_MESSAGES.signedOut };

async function signedIn() {
  const token = await readSessionToken();
  if (!token) return null;
  const post: PostJson = (path, json) => callBackend(path, { method: "POST", json, token });
  const ping = () => serviceKeyRejected((path) => callBackend(path));
  return { post, ping };
}

async function settle<T extends { ok: boolean }>(result: T): Promise<T> {
  if (!result.ok && (result as unknown as InvestFailure).code === "signed_out") await clearSession();
  return result;
}

export async function createInvestmentAction(input: { planSlug: string; amount: string }): Promise<CreateIntentResult> {
  const deps = await signedIn();
  if (!deps) return settle(signedOut);
  return settle(
    await createIntent(
      { planSlug: input?.planSlug, amount: input?.amount },
      { ...deps, loadPlan: (slug) => getPortalPlan(slug) },
    ),
  );
}

export async function requestConsentAction(input: { investmentId: string }): Promise<ConsentRequestResult> {
  const deps = await signedIn();
  if (!deps) return settle(signedOut);
  return settle(await requestConsent(input?.investmentId, deps));
}

export async function verifyConsentAction(input: {
  investmentId: string;
  challengeId: string;
  code: string;
}): Promise<ConsentVerifyResult> {
  const deps = await signedIn();
  if (!deps) return settle(signedOut);
  return settle(
    await verifyConsent({ investmentId: input?.investmentId, challengeId: input?.challengeId, code: input?.code }, deps),
  );
}

export async function startPaymentAction(input: { investmentId: string }): Promise<StartPaymentResult> {
  const deps = await signedIn();
  if (!deps) return settle(signedOut);
  return settle(
    await startPayment(input?.investmentId, { ...deps, mode: parseCashfreeMode(process.env.NEXTERA_CASHFREE_MODE) }),
  );
}
