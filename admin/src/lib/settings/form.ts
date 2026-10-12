import { percentToBps, rupeesToPaise, settingsUpdateSchema } from "@nextera/contracts";
import type { Settings, SettingsUpdate } from "@nextera/contracts";
import { issuesToFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import { MAX_RUPEE_DIGITS, parseDecimal, wholeDigits } from "@/lib/plans/form";

export type SettingsFormValues = { tdsRate: string; minWithdrawal: string };

export const settingsFieldMap: Record<string, keyof SettingsFormValues> = {
  tdsRateBps: "tdsRate",
  minWithdrawalPaise: "minWithdrawal",
};

export function readSettingsForm(formData: FormData): SettingsFormValues {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return { tdsRate: text("tdsRate"), minWithdrawal: text("minWithdrawal") };
}

function decimalString(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}

export function settingsToValues(settings: Settings): SettingsFormValues {
  return {
    tdsRate: decimalString(settings.tdsRateBps / 100),
    minWithdrawal: decimalString(settings.minWithdrawalPaise / 100),
  };
}

export type SettingsBuild =
  | { status: "changed"; payload: SettingsUpdate }
  | { status: "unchanged" }
  | { status: "invalid"; errors: FieldErrors };

export const NO_CHANGES = "No changes to save";

export function buildSettingsUpdate(values: SettingsFormValues, current: Settings): SettingsBuild {
  const errors: FieldErrors = {};

  const rate = parseDecimal(values.tdsRate);
  if (rate === null) errors.tdsRate = ["Enter a percentage with up to 2 decimals, e.g. 10"];

  const rupees = parseDecimal(values.minWithdrawal);
  let minWithdrawalPaise = NaN;
  if (rupees === null) {
    errors.minWithdrawal = ["Enter an amount in rupees, e.g. 1000"];
  } else if (wholeDigits(values.minWithdrawal) > MAX_RUPEE_DIGITS) {
    errors.minWithdrawal = ["Amount is too large"];
  } else {
    try {
      minWithdrawalPaise = rupeesToPaise(rupees);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      errors.minWithdrawal = ["Amount is too large"];
    }
  }

  if (Object.keys(errors).length > 0) return { status: "invalid", errors };

  const next: Settings = { tdsRateBps: percentToBps(rate ?? NaN), minWithdrawalPaise };
  const checked = settingsUpdateSchema.safeParse(next);
  if (!checked.success) {
    return { status: "invalid", errors: issuesToFields(checked.error.issues, settingsFieldMap) };
  }

  const patch: SettingsUpdate = {};
  for (const key of Object.keys(next) as (keyof Settings)[]) {
    if (next[key] !== current[key]) patch[key] = next[key];
  }
  if (Object.keys(patch).length === 0) return { status: "unchanged" };
  return { status: "changed", payload: patch };
}
