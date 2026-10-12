"use server";

import { redirect } from "next/navigation";
import { staffLoginSchema } from "@nextera/contracts";
import type { StaffSessionResponse } from "@nextera/contracts";
import { loginErrorMessage } from "@/lib/authMessages";
import { callBackend } from "@/lib/backend/server";
import { safeNextPath } from "@/lib/request";
import { storeSession } from "@/lib/session";
import { PASSWORD_PATH } from "@/lib/sessionCookie";
import { toAdminStaff } from "@/lib/staff";

type LoginField = "email" | "password" | "totp";

export type LoginState = {
  status: "idle" | "error";
  message?: string;
  fields?: Partial<Record<LoginField, string[]>>;
  email?: string;
};

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    totp: String(formData.get("totp") ?? "").replace(/\s+/g, ""),
  };
  const next = safeNextPath(String(formData.get("next") ?? ""));

  const parsed = staffLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fields: parsed.error.flatten().fieldErrors,
      email: raw.email,
    };
  }

  const result = await callBackend<StaffSessionResponse>("/v1/staff/auth/login", {
    method: "POST",
    json: parsed.data,
  });

  if (!result.ok) {
    return {
      status: "error",
      message: loginErrorMessage(result.error),
      fields: result.error.fields as LoginState["fields"],
      email: raw.email,
    };
  }

  await storeSession(result.data.token, result.data.expiresAt);
  const staff = toAdminStaff(result.data.staff);
  redirect(staff?.mustChangePassword ? PASSWORD_PATH : next);
}
