"use server";

import type { Settings } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import { buildSettingsUpdate, readSettingsForm, settingsFieldMap } from "@/lib/settings/form";
import { toSettings } from "@/lib/settings/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord } from "@/lib/shape";

export type SettingsSaved = { settings: Settings; changed: boolean };
export type SettingsResult = ActionOutcome<SettingsSaved>;

function settingsFrom(data: unknown): Settings | null {
  return isRecord(data) ? toSettings(data.settings) : null;
}

export async function updateSettings(formData: FormData): Promise<SettingsResult> {
  const auth = await authorizeAction("settings.manage");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };

  const current = await staffRequest<unknown>(auth.token, "/v1/admin/settings");
  if (!current.ok) return backendFailure(current.error);
  const currentSettings = settingsFrom(current.data);
  if (!currentSettings) return unexpectedResponse("settings");

  const built = buildSettingsUpdate(readSettingsForm(formData), currentSettings);
  if (built.status === "invalid") {
    return { status: "error", code: "validation", message: CHECK_FIELDS, errors: built.errors };
  }
  if (built.status === "unchanged") return { status: "ok", data: { settings: currentSettings, changed: false } };

  const result = await staffRequest<unknown>(auth.token, "/v1/admin/settings", { method: "PATCH", json: built.payload });
  if (!result.ok) return backendFailure(result.error, settingsFieldMap);
  const settings = settingsFrom(result.data);
  return settings ? { status: "ok", data: { settings, changed: true } } : unexpectedResponse("settings");
}
