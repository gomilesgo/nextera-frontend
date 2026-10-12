import { paymentFlagResolveSchema, paymentFlagResolutions } from "@nextera/contracts";
import type { AdminPayment, PaymentFlagResolution, PaymentFlagResolve } from "@nextera/contracts";
import { issuesToFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import { isOneOf, isRecord } from "@/lib/shape";

export const NOTE_MAX_LENGTH = 1000;
export const CHOOSE_RESOLUTION = "Choose how this flag was resolved";

export type ResolveDraft = {
  resolution: PaymentFlagResolution | "";
  refundId: string;
  ledgerTransactionId: string;
  note: string;
};

export const emptyResolveDraft: ResolveDraft = { resolution: "", refundId: "", ledgerTransactionId: "", note: "" };

export type ParsedResolution = { ok: true; data: PaymentFlagResolve } | { ok: false; errors: FieldErrors };

export type ActivationAvailability = "available" | "unavailable" | "unknown";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function candidate(resolution: PaymentFlagResolution, raw: Record<string, unknown>): Record<string, string> {
  const note = text(raw.note);
  if (resolution === "refunded") return { resolution, refundId: text(raw.refundId), note };
  if (resolution === "posted_manually") return { resolution, ledgerTransactionId: text(raw.ledgerTransactionId).toLowerCase(), note };
  return { resolution, note };
}

export function parseResolution(input: unknown): ParsedResolution {
  const raw = isRecord(input) ? input : {};
  const resolution = raw.resolution;
  if (!isOneOf(paymentFlagResolutions, resolution)) {
    const noteOnly = paymentFlagResolveSchema.safeParse(candidate("activated", raw));
    const noteErrors = noteOnly.success ? {} : issuesToFields(noteOnly.error.issues);
    return { ok: false, errors: { ...noteErrors, resolution: [CHOOSE_RESOLUTION] } };
  }
  const parsed = paymentFlagResolveSchema.safeParse(candidate(resolution, raw));
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: issuesToFields(parsed.error.issues) };
}

export function activationAvailability(payment: AdminPayment | null): ActivationAvailability {
  if (!payment) return "unknown";
  return payment.status === "paid" ? "available" : "unavailable";
}
