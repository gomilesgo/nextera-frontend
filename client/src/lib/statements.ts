import { formatPaise } from "@nextera/contracts";
import type { StatementEntry, StatementResponse } from "@nextera/contracts";

export type PortalStatementEntry = {
  id: string;
  account: string;
  direction: "debit" | "credit";
  amountPaise: number;
  refType: string;
  investmentId: string | null;
  periodNo: number | null;
  createdAt: string;
};

export type PortalStatementPage = { entries: PortalStatementEntry[]; nextCursor: string | null };

export type EntryDescription = { title: string; detail: string | null };

const PRINCIPAL = "principal:";
const ACCRUAL_MEMO = /period (\d{1,3}) of investment ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function toPortalEntry(entry: StatementEntry): PortalStatementEntry {
  const accrual = entry.refType === "accrual" ? ACCRUAL_MEMO.exec(entry.memo) : null;
  return {
    id: entry.id,
    account: entry.account,
    direction: entry.direction,
    amountPaise: entry.amountPaise,
    refType: entry.refType,
    investmentId: entry.investmentId ?? accrual?.[2]?.toLowerCase() ?? null,
    periodNo: accrual?.[1] ? Number(accrual[1]) : null,
    createdAt: entry.createdAt,
  };
}

export function toPortalStatementPage(page: StatementResponse): PortalStatementPage {
  return { entries: page.entries.map(toPortalEntry), nextCursor: page.nextCursor };
}

export function accountLabel(account: string): string {
  if (account === "wallet") return "Wallet";
  if (account === "withdrawal_hold") return "Withdrawal hold";
  if (account.startsWith(PRINCIPAL)) return "Invested principal";
  return "Account";
}

function credit(entry: PortalStatementEntry): boolean {
  return entry.direction === "credit";
}

function generic(entry: PortalStatementEntry): string {
  if (entry.account === "wallet") return credit(entry) ? "Credit to wallet" : "Debit from wallet";
  if (entry.account === "withdrawal_hold") return credit(entry) ? "Held for withdrawal" : "Released from withdrawal hold";
  if (entry.account.startsWith(PRINCIPAL)) return credit(entry) ? "Added to investment" : "Released from investment";
  return credit(entry) ? "Credit" : "Debit";
}

export function describeEntry(
  entry: PortalStatementEntry,
  planNames: ReadonlyMap<string, string> = new Map(),
): EntryDescription {
  const plan = entry.investmentId ? (planNames.get(entry.investmentId) ?? null) : null;
  switch (entry.refType) {
    case "payment":
      if (entry.account.startsWith(PRINCIPAL) && credit(entry)) return { title: "Investment funded", detail: plan };
      break;
    case "accrual":
      if (entry.account !== "wallet" || !credit(entry)) break;
      return {
        title: "Monthly return credited",
        detail: [entry.periodNo ? `Month ${entry.periodNo}` : null, plan].filter(Boolean).join(" · ") || null,
      };
    case "maturity":
      if (entry.account.startsWith(PRINCIPAL) && !credit(entry)) return { title: "Principal released at maturity", detail: plan };
      if (entry.account === "wallet" && credit(entry)) return { title: "Matured principal added to wallet", detail: null };
      break;
    case "manual_adjustment":
      return { title: credit(entry) ? "Adjustment credited" : "Adjustment debited", detail: "Made by the Nextera team" };
  }
  return { title: generic(entry), detail: plan };
}

export function signedAmount(entry: Pick<PortalStatementEntry, "direction" | "amountPaise">): string {
  return `${entry.direction === "credit" ? "+" : "−"}${formatPaise(entry.amountPaise)}`;
}
