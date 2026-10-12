"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import type { WalletTransaction } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { formatTimestamp } from "@/lib/dates";
import { walletTransactionsQuery } from "@/lib/queries/options";
import { cx } from "@/lib/cx";

function accountLabel(account: string): string {
  if (account === "wallet") return "Wallet";
  if (account === "withdrawal_hold") return "Withdrawal hold";
  if (account.startsWith("principal:")) return "Investment";
  return account;
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const at = formatTimestamp(tx.at);
  const isCredit = tx.direction === "credit";
  const tone: BadgeTone = isCredit ? "success" : "neutral";

  return (
    <li className="hairline grid gap-1.5 rounded-[2px] bg-horizon/60 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm text-parchment">{tx.description || accountLabel(tx.account)}</p>
        <p className="mt-0.5 text-xs text-dust">
          {accountLabel(tx.account)} · {at ?? "—"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={tone}>{isCredit ? "Credit" : "Debit"}</Badge>
        <span className={cx("font-mono text-sm tnum", isCredit ? "text-moss" : "text-parchment")}>
          {isCredit ? "+" : "−"}{formatPaise(tx.amountPaise)}
        </span>
      </div>
    </li>
  );
}

export function HistoryView() {
  const transactions = useQuery(walletTransactionsQuery());

  return (
    <div className="grid gap-10">
      <header>
        <p className="eyebrow">History</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Money history</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">
          Every credit and debit across your wallet, investments and withdrawals.
        </p>
      </header>

      {transactions.isPending ? (
        <p className="text-dust" role="status">Loading history…</p>
      ) : transactions.isError ? (
        <Notice tone="error" title="Could not load history">
          <span className="block">{transactions.error.message}</span>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => transactions.refetch()}
            disabled={transactions.isFetching}
          >
            {transactions.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </Notice>
      ) : transactions.data.transactions.length === 0 ? (
        <div className="hairline rounded-[2px] p-6 text-sm leading-6 text-parchment/75">
          <p className="font-medium text-parchment">No transactions yet</p>
          <p className="mt-1">
            Your returns, investments and withdrawals will appear here once they are processed.
          </p>
        </div>
      ) : (
        <section aria-label="Transaction history">
          <ul className="grid gap-2">
            {transactions.data.transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
          {transactions.data.nextCursor ? (
            <p className="mt-6 text-center text-xs text-dust">
              Showing the most recent transactions. Older entries are available via the admin console.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
