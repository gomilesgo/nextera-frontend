import { PAN_PATTERN } from "@nextera/contracts";

const MASKED_PAN = /^X{6}[A-Z0-9]{4}$/;

export function maskPan(pan: string): string {
  const compact = pan.replace(/\s/g, "").toUpperCase();
  return `XXXXXX${compact.slice(-4)}`;
}

export function maskAccountNumber(accountNo: string): string {
  const digits = accountNo.replace(/\D/g, "");
  return `XXXX${digits.slice(-4)}`;
}

export function safeMaskedPan(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().toUpperCase();
  if (PAN_PATTERN.test(compact)) return maskPan(compact);
  return MASKED_PAN.test(compact) ? compact : null;
}

export function accountEnding(last4: string): string {
  return `•••• ${last4}`;
}

export function safeLast4(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}
