"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { canSubmitKyc, kycFormDefaults } from "@/lib/kyc";
import { useSubmitKyc } from "@/lib/queries/mutations";
import { kycQuery } from "@/lib/queries/options";
import { KycForm } from "./KycForm";
import { KycStatusCard } from "./KycStatusCard";

function PageHeader() {
  return (
    <header>
      <p className="eyebrow">Verification</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Know your customer</h1>
      <p className="mt-3 max-w-2xl text-parchment/75">
        We verify every investor once, before any money moves.
      </p>
    </header>
  );
}

function Checklist() {
  return (
    <aside aria-labelledby="kyc-need-heading" className="hairline rounded-[2px] p-6 text-sm leading-6 text-parchment/80">
      <h2 id="kyc-need-heading" className="label">
        Have these ready
      </h2>
      <ul className="mt-4 grid gap-3">
        <li>Your PAN card, to copy your PAN and name exactly as printed.</li>
        <li>Your date of birth as it appears on your PAN.</li>
        <li>Your current residential address with its 6-digit PIN code.</li>
      </ul>
      <p className="mt-5 border-t border-border pt-4 text-xs text-dust">
        Next you will add a bank account in the same name. We confirm the account with your bank through Cashfree, which
        may involve a small ₹1 credit.
      </p>
    </aside>
  );
}

export function KycView() {
  const kyc = useQuery(kycQuery());
  const submit = useSubmitKyc();
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submit.isSuccess) successRef.current?.focus();
  }, [submit.isSuccess]);

  if (!kyc.data) {
    return (
      <div className="grid gap-10">
        <PageHeader />
        {kyc.isError ? (
          <Notice tone="error" title="We could not load your KYC status">
            <span className="block">{kyc.error.message}</span>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => kyc.refetch()} disabled={kyc.isFetching}>
              {kyc.isFetching ? "Retrying…" : "Try again"}
            </Button>
          </Notice>
        ) : (
          <div className="hairline min-h-48 rounded-[2px] bg-horizon/60 p-6" role="status">
            <p className="text-dust">Loading your KYC status…</p>
          </div>
        )}
      </div>
    );
  }

  const data = kyc.data;
  const editable = canSubmitKyc(data.kycStatus);

  return (
    <div className="grid gap-10">
      <PageHeader />

      {submit.isSuccess && data.kycStatus === "submitted" ? (
        <div ref={successRef} tabIndex={-1} className="outline-none">
          <Notice tone="success" title="Thank you. Your details are with our team.">
            We will review them, usually within two working days. Check back here for the result.
          </Notice>
        </div>
      ) : null}

      <KycStatusCard kyc={data} />

      {editable ? (
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_20rem]">
          <section className="hairline rounded-[2px] bg-horizon/60 p-6 sm:p-8">
            <KycForm
              submit={submit}
              defaults={kycFormDefaults(data.profile)}
              previousPanMasked={data.profile?.panMasked ?? null}
              resubmission={data.kycStatus === "rejected"}
            />
          </section>
          <Checklist />
        </div>
      ) : data.kycStatus === "verified" ? (
        <section aria-labelledby="kyc-next-heading" className="hairline flex flex-col gap-5 rounded-[2px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 id="kyc-next-heading" className="font-display text-2xl">
              Next: add your bank account
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-parchment/75">
              Returns and withdrawals are paid only to a bank account in your name that we have verified.
            </p>
          </div>
          <ButtonLink href="/portal/bank" className="w-full sm:w-auto">
            Add bank account
          </ButtonLink>
        </section>
      ) : (
        <section aria-labelledby="kyc-review-heading" className="hairline rounded-[2px] p-6 text-sm leading-6 text-parchment/80 sm:p-8">
          <h2 id="kyc-review-heading" className="label">
            What happens next
          </h2>
          <ol className="mt-4 grid gap-2">
            <li>1. Our team checks your PAN, name and date of birth.</li>
            <li>2. This page shows when your KYC is verified, or what needs correcting.</li>
            <li>3. Once verified, you add a bank account and can then invest online.</li>
          </ol>
        </section>
      )}
    </div>
  );
}
