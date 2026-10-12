import "server-only";
import type { BackendResult } from "@/lib/backend/client";
import { readBackend, unwrapForPage } from "@/lib/backend/read";
import type { SettingsResponse } from "@/lib/queries/options";
import { isRecord } from "@/lib/shape";
import { toSettings } from "./shape";

export function fetchSettings(token: string): Promise<BackendResult<SettingsResponse>> {
  return readBackend(
    token,
    "/v1/admin/settings",
    (data) => {
      const settings = isRecord(data) ? toSettings(data.settings) : null;
      return settings ? { settings } : null;
    },
    "settings",
  );
}

export async function loadSettings(token: string): Promise<SettingsResponse> {
  const settings = unwrapForPage(await fetchSettings(token));
  if (!settings) throw new Error("Settings are unavailable");
  return settings;
}
