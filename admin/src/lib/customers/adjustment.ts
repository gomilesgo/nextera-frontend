import {
  MANUAL_ADJUSTMENT_MAX_PAISE,
  formatPaise,
  idempotencyKeySchema,
  ledgerDirections,
  manualAdjustmentSchema,
  rupeesToPaise,
} from "@nextera/contracts";
import type { LedgerDirection, ManualAdjustmentInput, ManualAdjustmentResponse } from "@nextera/contracts";
import { issuesToFields } from "@/lib/listing/params";
import { addError, mapFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import type { Built } from "./form";

export const MAX_ADJUSTMENT_LABEL = formatPaise(MANUAL_ADJUSTMENT_MAX_PAISE);

const MAX_WHOLE_DIGITS = String(MANUAL_ADJUSTMENT_MAX_PAISE / 100).length;

export type AmountParse = { ok: true; paise: number } | { ok: false; message: string };

export type AdjustmentFormValues = {
  direction: string;
  amount: string;
  reason: string;
  idempotencyKey: string;
};

export type AdjustmentPayload = ManualAdjustmentInput & { idempotencyKey: string };

const adjustmentAliases: Record<string, string> = {
  direction: "direction",
  amountPaise: "amount",
  reason: "reason",
  account: "_",
  idempotencyKey: "_",
};

export function parseAdjustmentAmount(raw: string): AmountParse {
  const cleaned = raw.replace(/[,\s₹]/g, "");
  if (cleaned === "") return { ok: false, message: "Enter the amount in rupees" };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, message: "Enter rupees with up to 2 decimals, for example 2500 or 2500.50" };
  }
  const whole = cleaned.split(".")[0]?.replace(/^0+(?=\d)/, "") ?? "";
  const tooLarge = { ok: false as const, message: `Manual adjustments are limited to ${MAX_ADJUSTMENT_LABEL}` };
  if (whole.length > MAX_WHOLE_DIGITS) return tooLarge;
  let paise: number;
  try {
    paise = rupeesToPaise(Number(cleaned));
  } catch (error) {
    if (error instanceof RangeError) return tooLarge;
    throw error;
  }
  if (paise < 1) return { ok: false, message: "Amount must be above zero" };
  if (paise > MANUAL_ADJUSTMENT_MAX_PAISE) return tooLarge;
  return { ok: true, paise };
}

function isDirection(value: string): value is LedgerDirection {
  return (ledgerDirections as readonly string[]).includes(value);
}

export function readAdjustmentForm(formData: FormData): AdjustmentFormValues {
  const read = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    direction: read("direction"),
    amount: read("amount"),
    reason: read("reason"),
    idempotencyKey: read("idempotencyKey"),
  };
}

export function buildAdjustment(values: AdjustmentFormValues): Built<AdjustmentPayload> {
  const errors: FieldErrors = {};
  if (!isDirection(values.direction)) addError(errors, "direction", "Choose credit or debit");
  const amount = parseAdjustmentAmount(values.amount);
  if (!amount.ok) addError(errors, "amount", amount.message);
  const key = idempotencyKeySchema.safeParse(values.idempotencyKey);
  if (!key.success) addError(errors, "_", "This form expired. Close it and start the adjustment again.");

  const parsed = manualAdjustmentSchema.safeParse({
    direction: values.direction,
    account: "wallet",
    amountPaise: amount.ok ? amount.paise : 1,
    reason: values.reason,
    idempotencyKey: key.success ? key.data : undefined,
  });
  if (!parsed.success) {
    for (const [field, messages] of Object.entries(mapFields(issuesToFields(parsed.error.issues), adjustmentAliases))) {
      if (errors[field]) continue;
      for (const message of messages ?? []) addError(errors, field, message);
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success || !key.success) return { ok: false, errors };
  return { ok: true, payload: { ...parsed.data, idempotencyKey: key.data } };
}

export function mapAdjustmentFields(fields: Record<string, string[]> | undefined): FieldErrors {
  return mapFields(fields, adjustmentAliases);
}

export function signedAmount(direction: LedgerDirection, amountPaise: number): number {
  return direction === "credit" ? amountPaise : -amountPaise;
}

export function resultingBalance(currentPaise: number, direction: LedgerDirection, amountPaise: number): number {
  return currentPaise + signedAmount(direction, amountPaise);
}

export function walletBalance(balances: ReadonlyArray<{ account: string; balancePaise: number }>): number {
  return balances.find((balance) => balance.account === "wallet")?.balancePaise ?? 0;
}

export function newIdempotencyKey(random: () => string = () => crypto.randomUUID()): string {
  return `adj-${random()}`;
}

export type AdjustmentDraft =
  | { step: "edit"; key: string; values: AdjustmentFormValues | null }
  | { step: "confirm"; key: string; values: AdjustmentFormValues; payload: AdjustmentPayload }
  | { step: "done"; key: string; result: ManualAdjustmentResponse };

export type AdjustmentEvent =
  | { type: "review"; values: AdjustmentFormValues; payload: AdjustmentPayload }
  | { type: "edit"; freshKey?: string }
  | { type: "posted"; result: ManualAdjustmentResponse };

export function startAdjustment(generate: () => string = newIdempotencyKey): AdjustmentDraft {
  return { step: "edit", key: generate(), values: null };
}

export function backToEdit(failureCode: string | undefined, generate: () => string = newIdempotencyKey): AdjustmentEvent {
  return failureCode === "idempotency_conflict" ? { type: "edit", freshKey: generate() } : { type: "edit" };
}

export function advanceAdjustment(draft: AdjustmentDraft, event: AdjustmentEvent): AdjustmentDraft {
  switch (event.type) {
    case "review":
      if (draft.step === "done") return draft;
      return { step: "confirm", key: draft.key, values: event.values, payload: { ...event.payload, idempotencyKey: draft.key } };
    case "edit":
      if (draft.step !== "confirm") return draft;
      return { step: "edit", key: event.freshKey ?? draft.key, values: draft.values };
    case "posted":
      return { step: "done", key: draft.key, result: event.result };
  }
}
