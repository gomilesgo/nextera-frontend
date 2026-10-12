"use server";

import { redirect } from "next/navigation";
import { callBackend } from "@/lib/backend/server";
import { initialLoginState, requestCode, verifyCode } from "@/lib/login";
import type { LoginState, PostJson } from "@/lib/login";
import { safePortalPath } from "@/lib/request";
import { storeSession } from "@/lib/session";

const post: PostJson = (path, json) => callBackend(path, { method: "POST", json });

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const intent = text(formData, "intent");
  const previous: LoginState = {
    ...initialLoginState,
    ...prev,
    phone: text(formData, "phone") || prev.phone,
    challengeId: text(formData, "challengeId") || prev.challengeId,
  };

  if (intent === "change") {
    return { step: "phone", phone: previous.phone.replace(/^\+91/, "") };
  }

  if (intent === "request" || intent === "resend") {
    return requestCode({ phone: previous.phone, previous: intent === "resend" ? previous : initialLoginState }, post);
  }

  if (intent === "verify") {
    const outcome = await verifyCode(
      {
        phone: previous.phone,
        challengeId: previous.challengeId ?? "",
        code: text(formData, "code"),
        previous,
      },
      post,
    );
    if (outcome.kind === "state") return outcome.state;
    await storeSession(outcome.token, outcome.expiresAt);
    redirect(safePortalPath(text(formData, "next")));
  }

  return { ...previous, error: "Something went wrong. Please try again." };
}
