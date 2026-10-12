import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "border-parchment/15 text-dust",
  success: "border-moss/40 bg-moss/10 text-moss",
  warning: "border-gold/40 bg-gold/10 text-gold",
  danger: "border-ember/40 bg-ember/10 text-ember",
  info: "border-lagoon/40 bg-lagoon/10 text-lagoon",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
