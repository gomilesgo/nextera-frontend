"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { formatPaise } from "@nextera/contracts";
import type { AdminCustomerDetail } from "@nextera/contracts";
import { BankStatusBadge, CustomerKycBadge } from "@/components/customers/CustomerBadges";
import { PhoneField } from "@/components/customers/PhoneField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { CustomerAccess } from "@/lib/customers/access";
import { actionError } from "@/lib/customers/cache";
import { useCustomer } from "@/lib/customers/hooks";
import { accountLabel } from "@/lib/customers/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { useRevokeCustomerSessions, useUpdateCustomer } from "@/lib/customers/mutations";
import { formatIndianMobile } from "@/lib/customers/phone";
import { cx } from "@/lib/cx";

export function CustomerOverview({
  customerId,
  access,
  savedMessage,
}: {
  customerId: string;
  access: CustomerAccess;
  savedMessage?: string;
}) {
  const { data } = useCustomer(customerId);
  if (!data) return null;
  return (
    <div className="grid gap-5">
      {savedMessage ? <Notice tone="success">{savedMessage}</Notice> : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-5">
          <ProfileCard detail={data} access={access} />
          <BankCard detail={data} />
        </div>
        <div className="grid content-start gap-5">
          <BalancesCard detail={data} />
          <KycCard detail={data} canReview={access.canReviewKyc} canView={access.canViewKyc} />
          {access.canRevokeSessions ? <SessionsCard customerId={customerId} /> : null}
        </div>
      </div>
    </div>
  );
}

function Card({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="hairline grid content-start gap-4 rounded-[3px] bg-horizon/40 p-5">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Item({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="text-xs text-dust">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

function ProfileCard({ detail, access }: { detail: AdminCustomerDetail; access: CustomerAccess }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const update = useUpdateCustomer(detail.customer.id);
  const { customer } = detail;
  const editable = access.canWrite && customer.status !== "closed";

  return (
    <Card
      title="Profile"
      actions={
        editable && !editing ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : null
      }
    >
      <p aria-live="polite" className={cx("text-xs text-moss", saved ? "" : "sr-only")}>
        {saved ? "Profile saved." : ""}
      </p>
      {editing ? (
        <ProfileForm
          detail={detail}
          canChangePhone={access.canChangePhone}
          update={update}
          onCancel={() => {
            update.reset();
            setEditing(false);
          }}
          onSaved={() => {
            update.reset();
            setEditing(false);
            setSaved(true);
          }}
        />
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="Name">{customer.name ?? "Not provided"}</Item>
          <Item label="Email">{customer.email ?? "Not provided"}</Item>
          <Item label="Mobile">
            <span className="font-mono">{formatIndianMobile(customer.phone)}</span>
          </Item>
          <Item label="Last updated">{formatDateTime(customer.updatedAt)}</Item>
        </dl>
      )}
    </Card>
  );
}

function ProfileForm({
  detail,
  canChangePhone,
  update,
  onCancel,
  onSaved,
}: {
  detail: AdminCustomerDetail;
  canChangePhone: boolean;
  update: ReturnType<typeof useUpdateCustomer>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { customer } = detail;
  const failure = actionError(update.error);
  const errors = failure?.errors ?? {};

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate(new FormData(event.currentTarget), { onSuccess: onSaved });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div aria-live="assertive">
        {failure && !(failure.code === "conflict" && errors.phone) ? <Notice tone="error">{failure.message}</Notice> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" error={errors.name}>
          <TextInput
            name="name"
            defaultValue={customer.name ?? ""}
            required
            maxLength={100}
            autoFocus
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field name="email" label="Email" error={errors.email} hint="Leave blank to remove">
          <TextInput name="email" type="email" defaultValue={customer.email ?? ""} maxLength={200} invalid={Boolean(errors.email)} />
        </Field>
      </div>
      {canChangePhone ? (
        <div className="grid gap-1">
          <PhoneField defaultValue={formatIndianMobile(customer.phone)} error={errors.phone} />
          <p className="text-xs text-dust">Changing the number signs the customer out of every device.</p>
        </div>
      ) : (
        <div>
          <p className="eyebrow">Mobile number</p>
          <p className="mt-1.5 font-mono text-sm">{formatIndianMobile(customer.phone)}</p>
          <p className="mt-1 text-xs text-dust">Only an owner can change the mobile number.</p>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending} aria-busy={update.isPending}>
          {update.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function BalancesCard({ detail }: { detail: AdminCustomerDetail }) {
  return (
    <Card title="Ledger balances">
      {detail.balances.length === 0 ? (
        <p className="text-sm text-dust">No ledger activity yet.</p>
      ) : (
        <table className="data-table">
          <caption className="sr-only">Balance by ledger account</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col" className="num">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {detail.balances.map((balance) => (
              <tr key={balance.account}>
                <td>
                  <Link
                    href={`/customers/${detail.customer.id}/ledger?account=${encodeURIComponent(balance.account)}`}
                    className="hover:text-gold"
                  >
                    {accountLabel(balance.account)}
                  </Link>
                </td>
                <td className="num">{formatPaise(balance.balancePaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num font-semibold text-gold">{formatPaise(detail.totalBalancePaise)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </Card>
  );
}

function KycCard({ detail, canReview, canView }: { detail: AdminCustomerDetail; canReview: boolean; canView: boolean }) {
  const { kyc } = detail;
  const hasKyc = kyc.status !== "none";
  return (
    <Card
      title="KYC"
      actions={
        hasKyc && canView ? (
          <ButtonLink href={`/kyc/${detail.customer.id}`} variant="ghost" size="sm">
            {canReview ? "Open KYC review" : "View KYC"}
          </ButtonLink>
        ) : null
      }
    >
      <div>
        <CustomerKycBadge status={kyc.status} />
      </div>
      {kyc.status === "none" ? (
        <p className="text-sm text-dust">The customer has not submitted KYC yet.</p>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="PAN">
            <span className="font-mono">{kyc.panMasked ?? "—"}</span>
          </Item>
          <Item label="Name on PAN">{kyc.panName ?? "—"}</Item>
          <Item label="Submitted">{formatDateTime(kyc.submittedAt)}</Item>
          <Item label="Verified">{formatDateTime(kyc.verifiedAt)}</Item>
          {kyc.rejectionReason ? (
            <Item label="Rejection reason" className="sm:col-span-2">
              {kyc.rejectionReason}
            </Item>
          ) : null}
        </dl>
      )}
    </Card>
  );
}

function SessionsCard({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const revoke = useRevokeCustomerSessions(customerId);
  const error = revoke.error instanceof Error ? revoke.error.message : null;

  return (
    <Card title="Sessions">
      <p className="text-sm text-dust">Sign the customer out of every device immediately.</p>
      {done ? <Notice tone="success">All sessions revoked.</Notice> : null}
      <div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          Sign out all devices
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => {
          revoke.reset();
          setOpen(false);
        }}
        onConfirm={() => {
          revoke.mutate(undefined, {
            onSuccess: () => {
              setOpen(false);
              setDone(true);
            },
          });
        }}
        title="Sign out all devices"
        description="This revokes every active session for this customer immediately. They will need to sign in again."
        confirmLabel="Sign out all devices"
        pendingLabel="Signing out…"
        tone="danger"
        pending={revoke.isPending}
        error={error}
      />
    </Card>
  );
}

function BankCard({ detail }: { detail: AdminCustomerDetail }) {
  return (
    <Card title="Bank accounts">
      {detail.bankAccounts.length === 0 ? (
        <p className="text-sm text-dust">No bank accounts added.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Bank accounts</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">IFSC</th>
                <th scope="col">Holder</th>
                <th scope="col">Status</th>
                <th scope="col">Verified</th>
              </tr>
            </thead>
            <tbody>
              {detail.bankAccounts.map((account) => (
                <tr key={account.id}>
                  <td className="whitespace-nowrap">
                    <span className="font-mono">{account.accountMasked}</span>
                    {account.isPrimary ? <span className="ml-2 text-xs text-lagoon">Primary</span> : null}
                  </td>
                  <td className="font-mono text-xs">{account.ifsc}</td>
                  <td>{account.holderName}</td>
                  <td>
                    <BankStatusBadge status={account.status} />
                  </td>
                  <td className="whitespace-nowrap text-dust">{formatDate(account.verifiedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
