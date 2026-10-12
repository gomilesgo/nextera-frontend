import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export const controlClass =
  "h-9 w-full min-w-0 rounded-[3px] border border-input bg-horizon px-3 text-sm text-parchment outline-none transition-colors placeholder:text-dust/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-ember";

type FieldProps = {
  name: string;
  label: string;
  error?: string[] | string;
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function Field({ name, label, error, hint, className, children }: FieldProps) {
  const messages = typeof error === "string" ? [error] : (error ?? []);
  return (
    <div className={cx("grid content-start gap-1.5", className)}>
      <label htmlFor={name} className="eyebrow">
        {label}
      </label>
      {children}
      {messages.length > 0 ? (
        <p id={`${name}-error`} className="text-xs text-ember">
          {messages.join(" ")}
        </p>
      ) : hint ? (
        <p className="text-xs text-dust">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  name,
  invalid,
  className,
  ...props
}: ComponentProps<"input"> & { name: string; invalid?: boolean }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${name}-error` : undefined}
      className={cx(controlClass, className)}
      {...props}
    />
  );
}

export function TextArea({
  name,
  invalid,
  className,
  ...props
}: ComponentProps<"textarea"> & { name: string; invalid?: boolean }) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${name}-error` : undefined}
      className={cx(controlClass, "h-auto min-h-24 py-2", className)}
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
      className={cx(controlClass, className)}
      {...props}
    />
  );
}
