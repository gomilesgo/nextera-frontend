"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BankDecisionActions } from "@/components/bank/BankDecisionActions";
import { BankStatusBadge } from "@/components/bank/BankStatusBadge";
import { NameMatch } from "@/components/bank/NameMatch";
import { KycDecisionActions } from "@/components/kyc/KycDecisionActions";
import { KycStatusBadge } from "@/components/kyc/KycStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { holdLabel } from "@/lib/bank/labels";
import { formatDateTime, formatIsoDate, humanize } from "@/lib/format";
import { kycQueries } from "@/lib/queries/options";

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}

export function KycReview({
  customerId,
  canReview,
  canReviewBank,
}: {
  customerId: string;
  canReview: boolean;
  canReviewBank: boolean;
}) {
  const { data, error, isPending } = useQuery(kycQueries.customer(customerId));

  if (isPending) return <p className="text-sm text-dust">Loading KYC record…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Customer not found"}</Notice>;

  const { customer, profile, kycStatus, bankAccounts } = data;
  const reviewable = kycStatus === "submitted" && profile !== null;
  const bankActions = canReviewBank && kycStatus === "verified" && bankAccounts.some((account) => account.status === "review");

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="KYC review"
        title={customer.name ?? profile?.panName ?? "Unnamed customer"}
        description={<span className="font-mono">{customer.phone}</span>}
        actions={
          <>
            <KycStatusBadge status={kycStatus} />
            <ButtonLink href={`/kyc?status=${kycStatus === "none" ? "submitted" : kycStatus}`} variant="ghost" size="sm">
              Back to queue
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}

      <section aria-labelledby="customer-heading" className="grid gap-3">
        <h2 id="customer-heading" className="eyebrow">
          Customer
        </h2>
        <dl className="hairline grid gap-x-6 gap-y-4 rounded-[3px] bg-horizon/40 p-5 sm:grid-cols-4">
          <Item label="Mobile">
            <span className="font-mono">{customer.phone}</span>
          </Item>
          <Item label="Email">{customer.email ?? "—"}</Item>
          <Item label="Account">{humanize(customer.status)}</Item>
          <Item label="Profile name">{customer.name ?? "—"}</Item>
        </dl>
      </section>

      <section aria-labelledby="kyc-heading" className="grid gap-3">
        <h2 id="kyc-heading" className="eyebrow">
          Submitted details
        </h2>
        {profile ? (
          <dl className="hairline grid gap-x-6 gap-y-4 rounded-[3px] bg-horizon/40 p-5 sm:grid-cols-4">
            <Item label="PAN">
              <span className="font-mono">{profile.panMasked}</span>
            </Item>
            <Item label="Name on PAN">{profile.panName}</Item>
            <Item label="Date of birth">{formatIsoDate(profile.dob)}</Item>
            <Item label="Submitted">{formatDateTime(profile.submittedAt)}</Item>
            <Item label="Address" wide>
              <address className="not-italic">
                {profile.address.line1}
                {profile.address.line2 ? <>, {profile.address.line2}</> : null}
                <br />
                {profile.address.city}, {profile.address.state} {profile.address.pincode}
              </address>
            </Item>
            <Item label="Verified">{formatDateTime(profile.verifiedAt)}</Item>
            <Item label="Rejection reason">{profile.rejectionReason ?? "—"}</Item>
          </dl>
        ) : (
          <div className="hairline rounded-[3px] px-4 py-8 text-center text-sm text-dust">
            This customer has not submitted KYC details.
          </div>
        )}
      </section>

      {reviewable ? (
        canReview ? (
          <section aria-labelledby="decision-heading" className="hairline grid gap-3 rounded-[3px] p-5">
            <h2 id="decision-heading" className="text-sm font-medium">
              Decision
            </h2>
            <p className="text-sm text-dust">
              Check that the name and date of birth match the customer&apos;s PAN before approving.
            </p>
            <KycDecisionActions customerId={customerId} panName={profile.panName} />
          </section>
        ) : (
          <Notice>You have read-only access to KYC.</Notice>
        )
      ) : null}

      <section aria-labelledby="bank-heading" className="grid gap-3">
        <h2 id="bank-heading" className="eyebrow">
          Bank accounts
        </h2>
        {bankAccounts.length === 0 ? (
          <div className="hairline rounded-[3px] px-4 py-6 text-center text-sm text-dust">No bank accounts on file.</div>
        ) : (
          <div className="hairline overflow-x-auto rounded-[3px]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Name at bank</th>
                  <th>Name match</th>
                  <th>Note</th>
                  <th>Added</th>
                  {bankActions ? <th className="num">Decision</th> : null}
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <span className="font-mono">{account.accountMasked}</span>
                      <div className="font-mono text-xs text-dust">
                        {account.ifsc}
                        {account.isPrimary ? " · primary" : ""}
                      </div>
                    </td>
                    <td>
                      <BankStatusBadge status={account.status} />
                    </td>
                    <td>{account.nameAtBank ?? "—"}</td>
                    <td>
                      <NameMatch result={account.nameMatchResult} score={account.nameMatchScore} />
                    </td>
                    <td className="max-w-64 text-dust">
                      {account.status === "review"
                        ? holdLabel(account.holdReason)
                        : (account.reviewNote ?? account.failureReason ?? "—")}
                    </td>
                    <td className="whitespace-nowrap text-dust">{formatDateTime(account.createdAt)}</td>
                    {bankActions ? (
                      <td className="text-right">
                        {account.status === "review" ? <BankDecisionActions account={account} /> : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
