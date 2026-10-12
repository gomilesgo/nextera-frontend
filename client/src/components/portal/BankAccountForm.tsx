"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { firstInvalid } from "@/lib/a11y";
import { fieldErrors, mutationMessage } from "@/lib/actionResult";
import {
  ACCOUNT_INPUT_MAX,
  BANK_DAILY_ATTEMPTS,
  IFSC_INPUT_MAX,
  bankFields,
  bankLabels,
  ifscBankCode,
  normalizeIfsc,
  readBankForm,
  validateBank,
} from "@/lib/bank";
import type { BankErrors } from "@/lib/bank";
import type { useAddBankAccount } from "@/lib/queries/mutations";

export function BankAccountForm({ add, holderName }: { add: ReturnType<typeof useAddBankAccount>; holderName: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [localErrors, setLocalErrors] = useState<BankErrors | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ifsc, setIfsc] = useState("");

  const errors: BankErrors = localErrors ?? (fieldErrors(add.error) as BankErrors);
  const errorCount = Object.keys(errors).length;
  const message = localErrors ? null : mutationMessage(add.error);
  const bankCode = ifscBankCode(ifsc);

  useEffect(() => {
    if (attempt === 0 || (!localErrors && !add.error)) return;
    const target = firstInvalid(bankFields, localErrors ?? (fieldErrors(add.error) as BankErrors));
    const field = target ? document.getElementById(target) : null;
    if (field) field.focus();
    else summaryRef.current?.focus();
  }, [attempt, localErrors, add.error]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validation = validateBank(readBankForm(formData));
    setAttempt((count) => count + 1);
    if (!validation.ok) {
      setLocalErrors(validation.errors);
      return;
    }
    setLocalErrors(null);
    add.mutate(formData, {
      onSuccess: () => {
        formRef.current?.reset();
        setIfsc("");
      },
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby="bank-form-heading" className="grid gap-6">
      <div>
        <h2 id="bank-form-heading" className="font-display text-2xl">
          Add a bank account
        </h2>
        <p className="mt-2 text-sm leading-6 text-dust">Savings or current account with an Indian bank, in your own name.</p>
      </div>

      <div className="rounded-[2px] border border-border p-4">
        <p className="label">Account holder</p>
        <p className="mt-1.5 text-parchment">{holderName ?? "The name on your PAN"}</p>
        <p className="mt-1 text-xs leading-5 text-dust">
          Taken from your verified PAN. Accounts in any other name, including joint accounts where you are not the first holder,
          will not match.
        </p>
      </div>

      <div ref={summaryRef} tabIndex={-1} className="outline-none empty:hidden">
        {errorCount > 0 ? (
          <ErrorSummary errors={errors} order={bankFields} labels={bankLabels} />
        ) : message ? (
          <Notice tone="error">{message}</Notice>
        ) : null}
      </div>

      <Field name="accountNo" label="Account number" error={errors.accountNo} hint="9 to 18 digits, as on your cheque book or passbook">
        <TextInput
          name="accountNo"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={ACCOUNT_INPUT_MAX}
          required
          className="font-mono tracking-[0.08em] tnum"
          invalid={Boolean(errors.accountNo)}
          hasHint
        />
      </Field>
      <Field name="confirmAccountNo" label="Confirm account number" error={errors.confirmAccountNo} hint="Type it again so we know it is right">
        <TextInput
          name="confirmAccountNo"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={ACCOUNT_INPUT_MAX}
          required
          className="font-mono tracking-[0.08em] tnum"
          invalid={Boolean(errors.confirmAccountNo)}
          hasHint
        />
      </Field>
      <Field
        name="ifsc"
        label="IFSC"
        error={errors.ifsc}
        hint={bankCode ? `Bank code ${bankCode}. Check it matches your bank.` : "11 characters, for example HDFC0001234. The fifth character is always zero."}
      >
        <TextInput
          name="ifsc"
          value={ifsc}
          onChange={(event) => setIfsc(normalizeIfsc(event.currentTarget.value))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={IFSC_INPUT_MAX}
          required
          placeholder="HDFC0001234"
          className="font-mono tracking-[0.12em] uppercase"
          invalid={Boolean(errors.ifsc)}
          hasHint
        />
      </Field>

      <div className="grid gap-3 rounded-[2px] border border-lagoon/30 bg-lagoon/5 p-4 text-sm leading-6 text-parchment/85">
        <p className="font-medium text-parchment">How we verify it</p>
        <p>
          We confirm the account with your bank through Cashfree, which may involve a small ₹1 credit. Your bank returns the
          account holder&apos;s name, and we check it against the name on your PAN.
        </p>
        <p className="text-xs text-dust">
          You can make up to {BANK_DAILY_ATTEMPTS} verification attempts in 24 hours, and failed attempts count, so check the
          details first.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={add.isPending} aria-busy={add.isPending} className="w-full">
        {add.isPending ? "Verifying with your bank…" : "Verify and add account"}
      </Button>
    </form>
  );
}
