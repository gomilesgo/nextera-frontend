"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BankAccount, KycStatus } from "@nextera/contracts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { mutationMessage } from "@/lib/actionResult";
import { canBeRemoved } from "@/lib/bank";
import { kycCopy } from "@/lib/customer";
import { accountEnding } from "@/lib/mask";
import { useAddBankAccount, useRemoveBankAccount, useSetPrimaryBankAccount } from "@/lib/queries/mutations";
import { bankAccountsQuery, kycQuery, meQuery } from "@/lib/queries/options";
import { BankAccountForm } from "./BankAccountForm";
import { BankAccountItem } from "./BankAccountItem";

const gateCopy: Record<Exclude<KycStatus, "verified">, { title: string; body: string; cta: string }> = {
  none: {
    title: "Complete your KYC first",
    body: "We match your bank account to the name on your PAN, so your KYC must be verified before you add one.",
    cta: "Start KYC",
  },
  submitted: {
    title: "Your KYC is being reviewed",
    body: "You can add a bank account as soon as our team verifies your KYC. Check back here for the result.",
    cta: "View KYC status",
  },
  rejected: {
    title: "Your KYC needs attention",
    body: "Correct and resubmit your KYC. Once it is verified you can add a bank account here.",
    cta: "Fix KYC",
  },
};

function AddResult({ account }: { account: BankAccount }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), [account.id]);
  const ending = accountEnding(account.accountLast4);

  return (
    <div ref={ref} tabIndex={-1} className="outline-none">
      {account.status === "verified" ? (
        <Notice tone="success" title={`Account ${ending} is verified`}>
          Your bank confirmed the account and the name at your bank matches your PAN.
          {account.isPrimary ? " Returns and withdrawals will be paid to this account." : ""}
        </Notice>
      ) : (
        <Notice tone="info" title={`Account ${ending} is held for review`}>
          Your bank confirmed the account, but the name at the bank did not closely match the name on your PAN. Our team
          will review it, usually within two working days. You do not need to add it again.
        </Notice>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="eyebrow">Bank accounts</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Where your money goes</h1>
      <p className="mt-3 max-w-2xl text-parchment/75">
        Monthly returns and withdrawals are paid only to a verified bank account in your own name.
      </p>
    </header>
  );
}

export function BankView() {
  const me = useQuery(meQuery());
  const kyc = useQuery(kycQuery());
  const bank = useQuery(bankAccountsQuery());
  const add = useAddBankAccount();
  const primary = useSetPrimaryBankAccount();
  const remove = useRemoveBankAccount();

  const kycStatus = me.data?.customer.kycStatus ?? kyc.data?.kycStatus;
  const accounts = bank.data?.accounts ?? [];
  const holderName = kyc.data?.profile?.panName ?? null;
  const primaryError = mutationMessage(primary.error);
  const removeError = mutationMessage(remove.error);

  return (
    <div className="grid gap-10">
      <PageHeader />

      {kycStatus && kycStatus !== "verified" ? (
        <Notice tone="info" title={gateCopy[kycStatus].title}>
          <span className="block">{gateCopy[kycStatus].body}</span>
          <span className="mt-1 block text-xs text-dust">KYC status: {kycCopy[kycStatus].label}</span>
          <ButtonLink href="/portal/kyc" size="sm" className="mt-3">
            {gateCopy[kycStatus].cta}
          </ButtonLink>
        </Notice>
      ) : null}

      {add.isSuccess ? <AddResult account={add.data} /> : null}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="accounts-heading" className="grid gap-4">
          <h2 id="accounts-heading" className="label">
            Your accounts
          </h2>
          {primaryError ? <Notice tone="error">{primaryError}</Notice> : null}
          {removeError ? <Notice tone="error">{removeError}</Notice> : null}
          {bank.isPending ? (
            <div className="hairline min-h-40 rounded-[2px] bg-horizon/60 p-6" role="status">
              <p className="text-dust">Loading your bank accounts…</p>
            </div>
          ) : bank.isError ? (
            <Notice tone="error" title="We could not load your bank accounts">
              <span className="block">{bank.error.message}</span>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => bank.refetch()} disabled={bank.isFetching}>
                {bank.isFetching ? "Retrying…" : "Try again"}
              </Button>
            </Notice>
          ) : accounts.length === 0 ? (
            <div className="hairline rounded-[2px] p-6 text-sm leading-6 text-parchment/75">
              <p className="font-medium text-parchment">No bank accounts yet</p>
              <p className="mt-1">
                {kycStatus === "verified"
                  ? "Add the account you want your returns paid into. It takes under a minute."
                  : "Once your KYC is verified you can add the account you want your returns paid into."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-4">
              {accounts.map((account) => (
                <li key={account.id}>
                  <BankAccountItem
                    account={account}
                    onMakePrimary={(id) => primary.mutate(id)}
                    onRemove={(id) => remove.mutate(id)}
                    pending={primary.isPending && primary.variables === account.id}
                    removePending={remove.isPending && remove.variables === account.id}
                    removable={canBeRemoved(account, accounts)}
                  />
                </li>
              ))}
            </ul>
          )}
          {accounts.length > 1 ? (
            <p className="text-xs leading-5 text-dust">
              Payouts go to your primary account. You can remove non-primary accounts that have no open withdrawals.
            </p>
          ) : null}
        </section>

        {kycStatus === "verified" ? (
          <section className="hairline rounded-[2px] bg-horizon/60 p-6 sm:p-8">
            <BankAccountForm add={add} holderName={holderName} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
