"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { fieldErrors, mutationMessage } from "@/lib/actionResult";
import { kycCopy } from "@/lib/customer";
import { formatIndianMobile } from "@/lib/phone";
import { useLogout, useLogoutAll, useUpdateEmail } from "@/lib/queries/mutations";
import { meQuery } from "@/lib/queries/options";
import { kycBadgeTone } from "./KycStatusCard";

function Row({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="grid gap-1.5 border-t border-border py-5 first:border-t-0 first:pt-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="label pt-0.5">{label}</dt>
      <dd className="min-w-0">
        <div className="break-words text-parchment">{children}</div>
        {note ? <p className="mt-1 text-xs leading-5 text-dust">{note}</p> : null}
      </dd>
    </div>
  );
}

function EmailEditor({ currentEmail, onDone }: { currentEmail: string | null; onDone: () => void }) {
  const [value, setValue] = useState(currentEmail ?? "");
  const updateEmail = useUpdateEmail();
  const errors = fieldErrors(updateEmail.error);
  const mutError = mutationMessage(updateEmail.error);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    updateEmail.mutate(trimmed === "" ? null : trimmed, { onSuccess: () => onDone() });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {mutError && !errors.email ? <Notice tone="error">{mutError}</Notice> : null}
      <Field name="email" label="Email address" error={errors.email} optional>
        <TextInput
          name="email"
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          invalid={Boolean(errors.email)}
          hasHint={false}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateEmail.isPending} aria-busy={updateEmail.isPending}>
          {updateEmail.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={updateEmail.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ProfileView() {
  const me = useQuery(meQuery());
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const [editingEmail, setEditingEmail] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const customer = me.data?.customer;

  return (
    <div className="grid gap-10">
      <header>
        <p className="eyebrow">Profile</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Your details</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">The contact details we hold for you and how you sign in.</p>
      </header>

      {!customer ? (
        me.isError ? (
          <Notice tone="error" title="We could not load your profile">
            Please refresh the page. If this keeps happening, try again in a few minutes.
          </Notice>
        ) : (
          <div className="hairline min-h-64 rounded-[2px] bg-horizon/60 p-6" role="status">
            <p className="text-dust">Loading your profile…</p>
          </div>
        )
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="details-heading" className="hairline rounded-[2px] bg-horizon p-6 sm:p-8">
            <h2 id="details-heading" className="sr-only">
              Contact details
            </h2>
            <dl>
              <Row
                label="Name"
                note={
                  customer.name
                    ? "The name we hold for you. Contact us if it needs correcting."
                    : "We add the name on your PAN once your KYC is verified."
                }
              >
                {customer.name ?? <span className="text-dust">Not added yet</span>}
              </Row>
              <Row label="Mobile" note="You sign in with a one-time code sent to this number.">
                <span className="font-mono tnum">{formatIndianMobile(customer.phone)}</span>
              </Row>
              <Row
                label="Email"
                note={editingEmail ? undefined : "Used for statements and important notices."}
              >
                {editingEmail ? (
                  <EmailEditor currentEmail={customer.email} onDone={() => setEditingEmail(false)} />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span>{customer.email ?? <span className="text-dust">Not added</span>}</span>
                    <button
                      type="button"
                      onClick={() => setEditingEmail(true)}
                      className="text-sm text-gold underline-offset-4 hover:underline"
                    >
                      {customer.email ? "Edit" : "Add email"}
                    </button>
                  </div>
                )}
              </Row>
              <Row label="KYC">
                <span className="flex flex-wrap items-center gap-3">
                  <Badge tone={kycBadgeTone[kycCopy[customer.kycStatus].tone]}>{kycCopy[customer.kycStatus].label}</Badge>
                  <Link href="/portal/kyc" className="text-sm text-gold underline-offset-4 hover:underline">
                    {customer.kycStatus === "verified" ? "View details" : "Go to KYC"}
                  </Link>
                </span>
              </Row>
            </dl>
            <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-parchment/75">
              To change your mobile number, write to us at{" "}
              <a href={`mailto:${customer.email ?? ""}`} className="text-gold underline">
                support
              </a>
              .
            </p>
          </section>

          <section aria-labelledby="security-heading" className="hairline rounded-[2px] p-6 sm:p-8">
            <h2 id="security-heading" className="label">
              Sign-in and security
            </h2>
            <p className="mt-4 text-sm leading-6 text-parchment/80">
              Signing out ends your session on this device.
            </p>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-busy={logout.isPending}
            >
              {logout.isPending ? "Signing out…" : "Sign out of this device"}
            </Button>
            {logout.isError ? (
              <p role="alert" className="mt-2 text-sm text-ember">
                We could not sign you out. Please try again.
              </p>
            ) : null}

            <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-parchment/80">
              If you think someone else has access to your account, sign out of all devices immediately.
            </p>
            {confirmLogoutAll ? (
              <div className="mt-4 grid gap-2">
                <p className="text-sm text-parchment/75">This will end every session, including this one.</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={() => { logoutAll.mutate(); setConfirmLogoutAll(false); }}
                    disabled={logoutAll.isPending}
                    aria-busy={logoutAll.isPending}
                  >
                    {logoutAll.isPending ? "Signing out…" : "Sign out all devices"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmLogoutAll(false)} disabled={logoutAll.isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => setConfirmLogoutAll(true)}
              >
                Sign out of all devices
              </Button>
            )}
            {logoutAll.isError ? (
              <p role="alert" className="mt-2 text-sm text-ember">
                We could not sign out all devices. Please try again.
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
