"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { LEAD_LIMITS } from "@nextera/contracts";
import { submitEnquiry } from "@/app/(public)/enquire/actions";
import type { EnquiryState } from "@/app/(public)/enquire/actions";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ENQUIRY_HONEYPOT, emptyEnquiry, enquiryInterests } from "@/lib/enquiry";
import { brand } from "@/lib/site";

const initialState: EnquiryState = { status: "idle" };

export function EnquiryForm() {
  const [state, formAction] = useActionState(submitEnquiry, initialState);
  const summaryRef = useRef<HTMLDivElement>(null);
  const values = state.values ?? emptyEnquiry;
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status !== "idle") summaryRef.current?.focus();
  }, [state]);

  if (state.status === "ok") {
    return (
      <div ref={summaryRef} tabIndex={-1} className="hairline rounded-[2px] bg-horizon p-6 outline-none sm:p-10">
        <p className="eyebrow">Received</p>
        <p className="mt-4 font-display text-3xl text-parchment">Thank you. We will call you shortly.</p>
        <p className="mt-4 max-w-md leading-7 text-parchment/75">
          Our team usually responds within one working day.
          {state.ref ? (
            <>
              {" "}
              Your reference is <span className="font-mono whitespace-nowrap text-gold tnum">{state.ref}</span>.
            </>
          ) : null}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#plans" className="text-sm text-gold underline">
            Back to plans
          </Link>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form action={formAction} noValidate className="grid gap-6" aria-describedby="enquiry-status">
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={ENQUIRY_HONEYPOT}>Leave this field empty</label>
        <input
          id={ENQUIRY_HONEYPOT}
          name={ENQUIRY_HONEYPOT}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
        />
      </div>

      <div id="enquiry-status" ref={summaryRef} tabIndex={-1} className="outline-none empty:hidden">
        {state.status === "error" && state.kind === "validation" && errorCount > 0 ? (
          <Notice tone="error" title="Please check the highlighted fields">
            {errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`}
          </Notice>
        ) : null}
        {state.status === "error" && state.kind === "rate_limited" ? (
          <Notice tone="error">{state.message}</Notice>
        ) : null}
        {state.status === "error" && state.kind === "unavailable" ? (
          <Notice tone="error" title="We could not send your enquiry">
            Our systems are not responding right now. Please try again in a few minutes, or email{" "}
            <a href={`mailto:${brand.email}`} className="text-gold underline">
              {brand.email}
            </a>
            .
          </Notice>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Full name" error={errors.name}>
          <TextInput
            name="name"
            autoComplete="name"
            required
            maxLength={LEAD_LIMITS.name}
            defaultValue={values.name}
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field name="phone" label="Mobile number" error={errors.phone} hint="Indian mobile, 10 digits">
          <TextInput
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            maxLength={LEAD_LIMITS.phone}
            placeholder="98765 43210"
            defaultValue={values.phone}
            invalid={Boolean(errors.phone)}
            hasHint
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="email" label="Email" optional error={errors.email}>
          <TextInput
            name="email"
            type="email"
            autoComplete="email"
            maxLength={LEAD_LIMITS.email}
            defaultValue={values.email}
            invalid={Boolean(errors.email)}
          />
        </Field>
        <Field name="interest" label="Interested in" optional error={errors.interest}>
          <SelectInput name="interest" defaultValue={values.interest} invalid={Boolean(errors.interest)}>
            <option value="">Choose one</option>
            {enquiryInterests.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Field name="message" label="Message" optional error={errors.message} hint="Tell us the amount or plan you have in mind.">
        <TextArea
          name="message"
          rows={5}
          maxLength={LEAD_LIMITS.message}
          defaultValue={values.message}
          invalid={Boolean(errors.message)}
          hasHint
        />
      </Field>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-5 text-dust">
          We use these details only to respond to your enquiry. We never share them for marketing.
        </p>
        <SubmitButton size="lg" pendingLabel="Sending…" className="w-full sm:w-auto">
          Send enquiry
        </SubmitButton>
      </div>
    </form>
  );
}
