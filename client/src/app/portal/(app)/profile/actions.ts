"use server";

import type { CustomerProfile } from "@nextera/contracts";
import { customerEmailUpdateSchema } from "@nextera/contracts";
import { actionFailure, portalCall, unexpectedResponse } from "@/lib/portalAction";
import type { ActionFailure } from "@/lib/actionResult";
import { callBackend } from "@/lib/backend/server";
import { clearSession, readSessionToken } from "@/lib/session";

export type UpdateEmailResult = { status: "ok"; customer: CustomerProfile } | ActionFailure;

function toCustomerFromRaw(raw: unknown): CustomerProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.id !== "string" || typeof d.phone !== "string") return null;
  return raw as CustomerProfile;
}

export async function updateEmailAction(email: string | null): Promise<UpdateEmailResult> {
  const parsed = customerEmailUpdateSchema.safeParse({ email });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter a valid email address";
    return { status: "error", httpStatus: 400, code: "validation", message, fields: { email: [message] } };
  }

  const result = await portalCall<unknown>(
    "/v1/auth/me",
    { method: "PATCH", json: { email: parsed.data.email } },
    "profile.email",
  );

  if (!result.ok) return actionFailure("profile.email", result, {});

  const data = result.data as { customer?: unknown };
  const customer = toCustomerFromRaw(data?.customer);
  return customer ? { status: "ok", customer } : unexpectedResponse("profile.email");
}

export async function logoutAllAction(): Promise<{ ok: true }> {
  const token = await readSessionToken();
  if (token) {
    const result = await callBackend<void>("/v1/auth/logout-all", { method: "POST", token });
    if (!result.ok && result.error.code !== "unauthorized") {
      console.error("[logout-all] backend revoke failed:", result.error.code);
    }
  }
  await clearSession();
  return { ok: true };
}
