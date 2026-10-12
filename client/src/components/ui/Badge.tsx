import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "border-parchment/20 text-dust",
  success: "border-moss/40 bg-moss/10 text-moss",
  warning: "border-gold/40 bg-gold/10 text-gold",
  danger: "border-ember/40 bg-ember/10 text-ember",
  info: "border-lagoon/40 bg-lagoon/10 text-lagoon",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em]",
        tones[tone],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
