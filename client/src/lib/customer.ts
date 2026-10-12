import { customerStatuses, kycStatuses } from "@nextera/contracts";
import type { CustomerProfile, KycStatus } from "@nextera/contracts";

export type KycTone = "neutral" | "info" | "success" | "danger";

export const kycCopy: Record<KycStatus, { label: string; tone: KycTone; body: string }> = {
  none: {
    label: "Not started",
    tone: "neutral",
    body: "Before you can invest we need to verify your PAN, date of birth and address. It takes about two minutes, and you only do it once.",
  },
  submitted: {
    label: "Under review",
    tone: "info",
    body: "Thank you. Our team is reviewing your details. Most reviews finish within two working days. Check back here for the result.",
  },
  verified: {
    label: "Verified",
    tone: "success",
    body: "Your identity is verified. Add a bank account next so returns and withdrawals have somewhere to go.",
  },
  rejected: {
    label: "Needs attention",
    tone: "danger",
    body: "We could not verify the details you submitted. Check the reason from our team, correct your details and submit again.",
  },
};

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : undefined;
}

export function toCustomerProfile(raw: unknown): CustomerProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const name = nullableString(value.name);
  const email = nullableString(value.email);
  if (
    typeof value.id !== "string" ||
    typeof value.phone !== "string" ||
    name === undefined ||
    email === undefined ||
    !oneOf(customerStatuses, value.status) ||
    !oneOf(kycStatuses, value.kycStatus)
  ) {
    return null;
  }
  return {
    id: value.id,
    phone: value.phone,
    name: name?.trim() ? name.trim() : null,
    email,
    status: value.status,
    kycStatus: value.kycStatus,
  };
}

export function firstName(customer: Pick<CustomerProfile, "name">): string | null {
  const first = customer.name?.split(/\s+/)[0];
  return first ? first : null;
}
