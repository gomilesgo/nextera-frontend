import { IFSC_PATTERN, bankAccountInputSchema, bankAccountStatuses } from "@nextera/contracts";
import type { BankAccount, BankAccountInput, BankAccountStatus } from "@nextera/contracts";
import { safeLast4 } from "./mask";
import { cleanText, readText } from "./text";

export const BANK_DAILY_ATTEMPTS = 5;
export const ACCOUNT_INPUT_MAX = 32;
export const IFSC_LENGTH = 11;

export const bankFields = ["accountNo", "confirmAccountNo", "ifsc"] as const;

export type BankField = (typeof bankFields)[number];
export type BankValues = Record<BankField, string>;
export type BankErrors = Partial<Record<BankField, string>>;

export const bankLabels: Record<BankField, string> = {
  accountNo: "Account number",
  confirmAccountNo: "Confirm account number",
  ifsc: "IFSC",
};

export const IFSC_INPUT_MAX = 32;

export const emptyBank: BankValues = { accountNo: "", confirmAccountNo: "", ifsc: "" };

export function normalizeAccountNumber(raw: string): string {
  return cleanText(raw).replace(/[\s-]/g, "");
}

export function normalizeIfsc(raw: string): string {
  return cleanText(raw).replace(/\s/g, "").toUpperCase();
}

export function isValidIfsc(raw: string): boolean {
  return IFSC_PATTERN.test(normalizeIfsc(raw));
}

export function ifscBankCode(raw: string): string | null {
  const ifsc = normalizeIfsc(raw);
  return IFSC_PATTERN.test(ifsc) ? ifsc.slice(0, 4) : null;
}

export function readBankForm(formData: FormData): BankValues {
  const values = { ...emptyBank };
  for (const field of bankFields) values[field] = readText(formData, field);
  return values;
}

export type BankValidation = { ok: true; payload: BankAccountInput } | { ok: false; errors: BankErrors };

export function validateBank(values: BankValues): BankValidation {
  const errors: BankErrors = {};
  const parsed = bankAccountInputSchema.safeParse({
    accountNo: values.accountNo,
    ifsc: normalizeIfsc(values.ifsc),
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "accountNo" || key === "ifsc") errors[key] ??= issue.message;
    }
  }
  if (!values.confirmAccountNo) {
    errors.confirmAccountNo = "Re-enter your account number";
  } else if (normalizeAccountNumber(values.confirmAccountNo) !== normalizeAccountNumber(values.accountNo)) {
    errors.confirmAccountNo = "The account numbers do not match";
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, payload: parsed.data };
}

export function mapBankFields(fields: Record<string, string[]> | undefined): BankErrors {
  const errors: BankErrors = {};
  for (const [path, messages] of Object.entries(fields ?? {})) {
    const message = messages[0];
    if ((path === "accountNo" || path === "ifsc") && message) errors[path] ??= message;
  }
  return errors;
}

function nullableText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : undefined;
}

export function toBankAccount(raw: unknown): BankAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const last4 = safeLast4(value.accountLast4);
  const nameAtBank = nullableText(value.nameAtBank);
  const nameMatchResult = nullableText(value.nameMatchResult);
  const verifiedAt = nullableText(value.verifiedAt);
  const reviewNote = nullableText(value.reviewNote);
  if (
    typeof value.id !== "string" ||
    !last4 ||
    typeof value.ifsc !== "string" ||
    typeof value.holderName !== "string" ||
    typeof value.status !== "string" ||
    !(bankAccountStatuses as readonly string[]).includes(value.status) ||
    typeof value.isPrimary !== "boolean" ||
    typeof value.createdAt !== "string" ||
    nameAtBank === undefined ||
    nameMatchResult === undefined ||
    verifiedAt === undefined ||
    reviewNote === undefined
  ) {
    return null;
  }
  return {
    id: value.id,
    accountMasked: `XXXX${last4}`,
    accountLast4: last4,
    ifsc: value.ifsc,
    holderName: value.holderName,
    nameAtBank: value.status === "verified" ? nameAtBank : null,
    nameMatchResult,
    status: value.status as BankAccountStatus,
    isPrimary: value.isPrimary,
    verifiedAt,
    reviewNote,
    createdAt: value.createdAt,
  };
}

export function toBankAccounts(raw: unknown): BankAccount[] | null {
  if (!raw || typeof raw !== "object") return null;
  const list = (raw as { accounts?: unknown }).accounts;
  if (!Array.isArray(list)) return null;
  return list.map(toBankAccount).filter((account): account is BankAccount => account !== null);
}

export type BankTone = "neutral" | "info" | "success" | "danger" | "warning";

export const bankStatusCopy: Record<BankAccountStatus, { label: string; tone: BankTone; body: string }> = {
  verified: {
    label: "Verified",
    tone: "success",
    body: "Your bank confirmed the account and the name at your bank matches your PAN.",
  },
  review: {
    label: "In review",
    tone: "info",
    body: "Our team is checking this account by hand, usually because the name at the bank did not closely match the name on your PAN, or because your KYC changed. Most reviews finish within two working days.",
  },
  rejected: {
    label: "Not accepted",
    tone: "danger",
    body: "We could not accept this account. You can add it again once the reason below is resolved, or add a different account.",
  },
  pending: {
    label: "Verifying",
    tone: "warning",
    body: "We are confirming this account with your bank.",
  },
  failed: {
    label: "Failed",
    tone: "danger",
    body: "We could not verify this account. Check the account number and IFSC, then try again.",
  },
};

export function canBePrimary(account: BankAccount): boolean {
  return account.status === "verified" && !account.isPrimary;
}

export function canBeRemoved(account: BankAccount, allAccounts: readonly BankAccount[]): boolean {
  if (account.isPrimary) return false;
  const verifiedCount = allAccounts.filter((a) => a.status === "verified").length;
  if (account.status === "verified" && verifiedCount <= 1) return false;
  return true;
}

export function hasVerifiedAccount(accounts: readonly BankAccount[]): boolean {
  return accounts.some((account) => account.status === "verified");
}

export function bankProgress(accounts: readonly BankAccount[]): "none" | "review" | "verified" {
  if (hasVerifiedAccount(accounts)) return "verified";
  return accounts.some((account) => account.status === "review") ? "review" : "none";
}

export const BANK_ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
