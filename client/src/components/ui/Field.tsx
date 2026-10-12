import type { ComponentProps, ReactNode } from "react";
import { describedBy } from "@/lib/a11y";
import { cx } from "@/lib/cx";

export const controlClass =
  "h-12 w-full min-w-0 rounded-[2px] border border-parchment/15 bg-horizon px-4 text-base text-parchment outline-none transition-colors placeholder:text-dust/60 hover:border-parchment/25 focus-visible:border-lagoon focus-visible:ring-2 focus-visible:ring-lagoon/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-ember";

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children?: ReactNode;
};

export function Field({ name, label, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cx("grid content-start gap-2", className)}>
      <label htmlFor={name} className="label">
        {label}
        {optional ? <span className="ml-2 normal-case tracking-normal text-dust/70">(optional)</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="text-xs text-dust">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-ember">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  name,
  invalid,
  hasHint,
  className,
  ...props
}: ComponentProps<"input"> & { name: string; invalid?: boolean; hasHint?: boolean }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(name, invalid, hasHint)}
      className={cx(controlClass, className)}
      {...props}
    />
  );
}

export function TextArea({
  name,
  invalid,
  hasHint,
  className,
  ...props
}: ComponentProps<"textarea"> & { name: string; invalid?: boolean; hasHint?: boolean }) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(name, invalid, hasHint)}
      className={cx(controlClass, "h-auto min-h-32 py-3", className)}
      {...props}
    />
  );
}

export function SelectInput({
  name,
  invalid,
  className,
  ...props
}: ComponentProps<"select"> & { name: string; invalid?: boolean }) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(name, invalid)}
      className={cx(controlClass, "appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%238a9aa3' stroke-width='1.5'/%3E%3C/svg%3E\")",
      }}
      {...props}
    />
  );
}
