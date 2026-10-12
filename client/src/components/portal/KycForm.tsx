"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { firstInvalid } from "@/lib/a11y";
import { fieldErrors, mutationMessage } from "@/lib/actionResult";
import { formatIsoDate, todayInIndia } from "@/lib/dates";
import {
  KYC_CONSENT,
  KYC_LIMITS,
  PAN_INPUT_MAX,
  indianStates,
  kycFields,
  kycLabels,
  latestAdultDob,
  normalizePan,
  readKycForm,
  validateKyc,
} from "@/lib/kyc";
import type { KycErrors, KycValues } from "@/lib/kyc";
import type { useSubmitKyc } from "@/lib/queries/mutations";

export function KycForm({
  submit,
  defaults,
  previousPanMasked,
  resubmission,
}: {
  submit: ReturnType<typeof useSubmitKyc>;
  defaults: KycValues;
  previousPanMasked: string | null;
  resubmission: boolean;
}) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [localErrors, setLocalErrors] = useState<KycErrors | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pan, setPan] = useState(defaults.pan);
  const today = todayInIndia();
  const latestDob = latestAdultDob(today);

  const errors: KycErrors = localErrors ?? (fieldErrors(submit.error) as KycErrors);
  const errorCount = Object.keys(errors).length;
  const message = localErrors ? null : mutationMessage(submit.error);

  useEffect(() => {
    if (attempt === 0 || (!localErrors && !submit.error)) return;
    const target = firstInvalid(kycFields, localErrors ?? (fieldErrors(submit.error) as KycErrors));
    const field = target ? document.getElementById(target) : null;
    if (field) field.focus();
    else summaryRef.current?.focus();
  }, [attempt, localErrors, submit.error]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validation = validateKyc(readKycForm(formData), todayInIndia());
    setAttempt((count) => count + 1);
    if (!validation.ok) {
      setLocalErrors(validation.errors);
      return;
    }
    setLocalErrors(null);
    submit.mutate(formData);
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="kyc-form-heading" className="grid gap-8">
      <div>
        <h2 id="kyc-form-heading" className="font-display text-2xl sm:text-3xl">
          {resubmission ? "Correct and resubmit your details" : "Your details"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-dust">
          Enter your details exactly as they appear on your PAN card. Your PAN is encrypted when stored and only the last
          four characters are ever shown back to you.
        </p>
      </div>

      <div ref={summaryRef} tabIndex={-1} className="outline-none empty:hidden">
        {errorCount > 0 ? (
          <ErrorSummary errors={errors} order={kycFields} labels={kycLabels} />
        ) : message ? (
          <Notice tone="error">{message}</Notice>
        ) : null}
      </div>

      <fieldset className="grid gap-6">
        <legend className="eyebrow mb-5">Identity</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="pan"
            label="PAN"
            error={errors.pan}
            hint={
              previousPanMasked
                ? `Re-enter your full PAN. You previously submitted ${previousPanMasked}.`
                : "10 characters, for example ABCDE1234F"
            }
          >
            <TextInput
              name="pan"
              value={pan}
              onChange={(event) => setPan(normalizePan(event.currentTarget.value))}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={PAN_INPUT_MAX}
              required
              placeholder="ABCDE1234F"
              className="font-mono tracking-[0.12em] uppercase"
              invalid={Boolean(errors.pan)}
              hasHint
            />
          </Field>
          <Field name="panName" label="Name as on PAN" error={errors.panName} hint="Include your middle name if it is printed">
            <TextInput
              name="panName"
              defaultValue={defaults.panName}
              autoComplete="name"
              maxLength={KYC_LIMITS.panName}
              required
              invalid={Boolean(errors.panName)}
              hasHint
            />
          </Field>
        </div>
        <Field
          name="dob"
          label="Date of birth"
          error={errors.dob}
          hint={`You must be 18 or older, born on or before ${formatIsoDate(latestDob)}`}
          className="sm:max-w-xs"
        >
          <TextInput
            name="dob"
            type="date"
            defaultValue={defaults.dob}
            autoComplete="bday"
            min="1900-01-01"
            max={latestDob}
            required
            className="[color-scheme:dark]"
            invalid={Boolean(errors.dob)}
            hasHint
          />
        </Field>
      </fieldset>

      <fieldset className="grid gap-6 border-t border-border pt-8">
        <legend className="eyebrow mb-5">Address</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="line1" label="Address line 1" error={errors.line1} hint="House or flat number, building and street">
            <TextInput
              name="line1"
              defaultValue={defaults.line1}
              autoComplete="address-line1"
              maxLength={KYC_LIMITS.line1}
              required
              invalid={Boolean(errors.line1)}
              hasHint
            />
          </Field>
          <Field name="line2" label="Address line 2" optional error={errors.line2}>
            <TextInput
              name="line2"
              defaultValue={defaults.line2}
              autoComplete="address-line2"
              maxLength={KYC_LIMITS.line2}
              invalid={Boolean(errors.line2)}
            />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field name="city" label="City or town" error={errors.city}>
            <TextInput
              name="city"
              defaultValue={defaults.city}
              autoComplete="address-level2"
              maxLength={KYC_LIMITS.city}
              required
              invalid={Boolean(errors.city)}
            />
          </Field>
          <Field name="state" label="State or union territory" error={errors.state}>
            <SelectInput
              name="state"
              defaultValue={defaults.state}
              autoComplete="address-level1"
              required
              invalid={Boolean(errors.state)}
            >
              <option value="">Choose one</option>
              {indianStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field name="pincode" label="PIN code" error={errors.pincode}>
            <TextInput
              name="pincode"
              defaultValue={defaults.pincode}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={KYC_LIMITS.pincode}
              required
              className="tnum"
              invalid={Boolean(errors.pincode)}
            />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-2 border-t border-border pt-8">
        <div className="flex items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            value="yes"
            required
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "consent-hint consent-error" : "consent-hint"}
            className="mt-1 size-5 shrink-0 cursor-pointer accent-gold"
          />
          <label htmlFor="consent" className="cursor-pointer text-sm leading-6 text-parchment/85">
            I confirm these details are mine and match my PAN card, and I authorise Srahira to verify them for KYC.
          </label>
        </div>
        <p id="consent-hint" className="pl-8 text-xs leading-5 text-dust">
          We use these details only to verify your identity and meet our KYC obligations. Consent version{" "}
          <span className="font-mono">{KYC_CONSENT}</span>.
        </p>
        {errors.consent ? (
          <p id="consent-error" className="pl-8 text-sm text-ember">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-dust">
          After you submit, our team reviews your details, usually within two working days. You cannot edit them while the
          review is in progress.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={submit.isPending}
          aria-busy={submit.isPending}
          className="w-full sm:w-auto"
        >
          {submit.isPending ? "Submitting…" : resubmission ? "Resubmit for review" : "Submit for review"}
        </Button>
      </div>
    </form>
  );
}
