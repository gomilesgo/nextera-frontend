export const INDIA_DIAL_CODE = "+91";

export type PhonePreview =
  | { status: "empty" }
  | { status: "valid"; e164: string; display: string }
  | { status: "invalid"; message: string };

const mobileDigits = /^[6-9]\d{9}$/;

export function formatIndianMobile(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

function localDigits(cleaned: string): string | null {
  if (cleaned.startsWith("+")) return cleaned.startsWith("+91") ? cleaned.slice(3) : null;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
  if (cleaned.length === 11 && cleaned.startsWith("0")) return cleaned.slice(1);
  return cleaned;
}

export function previewIndianMobile(input: string): PhonePreview {
  const cleaned = input.replace(/[\s().-]/g, "");
  if (cleaned === "" || cleaned === INDIA_DIAL_CODE || cleaned === "+") return { status: "empty" };
  if (!/^\+?\d+$/.test(cleaned)) return { status: "invalid", message: "Use digits only, for example +91 98765 43210" };
  const digits = localDigits(cleaned);
  if (digits === null) return { status: "invalid", message: "Only Indian mobile numbers (+91) can be registered" };
  if (!mobileDigits.test(digits)) {
    return { status: "invalid", message: "Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9" };
  }
  const e164 = `${INDIA_DIAL_CODE}${digits}`;
  return { status: "valid", e164, display: formatIndianMobile(e164) };
}
