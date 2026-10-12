"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/ui/Field";
import { previewIndianMobile } from "@/lib/customers/phone";

export function PhoneField({
  name = "phone",
  label = "Mobile number",
  defaultValue = "+91 ",
  error,
  autoFocus,
}: {
  name?: string;
  label?: string;
  defaultValue?: string;
  error?: string[];
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const preview = previewIndianMobile(value);
  const hintId = `${name}-preview`;

  return (
    <Field name={name} label={label} error={error}>
      <TextInput
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        maxLength={20}
        autoFocus={autoFocus}
        className="font-mono"
        invalid={Boolean(error?.length)}
        aria-describedby={error?.length ? `${name}-error` : hintId}
      />
      {error?.length ? null : (
        <p id={hintId} aria-live="polite" className="min-h-4 text-xs text-dust">
          {preview.status === "valid" ? (
            <>
              Saved as <span className="font-mono text-parchment">{preview.e164}</span>
            </>
          ) : preview.status === "invalid" ? (
            <span className="text-gold">{preview.message}</span>
          ) : (
            "Indian mobile, +91 is added for you"
          )}
        </p>
      )}
    </Field>
  );
}
