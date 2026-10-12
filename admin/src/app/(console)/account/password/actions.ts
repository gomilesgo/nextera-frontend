"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePasswordChange } from "@/lib/account";
import type { PasswordChangeField } from "@/lib/account";
import { callBackend } from "@/lib/backend/server";
import { authorizeAction, expireSession } from "@/lib/session";

export type PasswordChangeState = {
  status: "idle" | "error";
  message?: string;
  fields?: Partial<Record<PasswordChangeField, string[]>>;
};

export async function changePassword(
  prev: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const auth = await authorizeAction(null, { allowPasswordChange: true });
  if (!auth.ok) return { status: "error", message: auth.message };

  const parsed = parsePasswordChange(formData);
  if (!parsed.ok) {
    return { status: "error", message: "Please check the highlighted fields.", fields: parsed.fields };
  }

  const result = await callBackend("/v1/staff/auth/password", {
    method: "POST",
    token: auth.token,
    json: parsed.request,
  });

  if (!result.ok) {
    if (result.error.code === "unauthorized") {
      const stillSignedIn = await callBackend("/v1/staff/auth/me", { token: auth.token });
      if (!stillSignedIn.ok && stillSignedIn.error.code === "unauthorized") return expireSession();
      return {
        status: "error",
        message: "Your current password is incorrect.",
        fields: { currentPassword: ["Your current password is incorrect."] },
      };
    }
    return {
      status: "error",
      message: result.error.code === "validation" ? "Please check the highlighted fields." : result.error.message,
      fields: result.error.fields as PasswordChangeState["fields"],
    };
  }

  revalidatePath("/", "layout");
  redirect("/?password=changed");
}
