import type { ComponentProps } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";

type Variant = "gold" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full text-center font-medium tracking-wide whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-lagoon/70 focus-visible:ring-offset-2 focus-visible:ring-offset-inkwell disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<Variant, string> = {
  gold: "bg-gold text-ink hover:bg-parchment",
  ghost: "border border-parchment/25 text-parchment hover:border-lagoon hover:text-lagoon",
  quiet: "text-parchment/75 hover:bg-horizon hover:text-parchment",
  danger: "border border-ember/50 text-ember hover:bg-ember/10",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-4 text-xs",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-7 text-sm",
};

export function buttonClass(variant: Variant = "gold", size: Size = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
