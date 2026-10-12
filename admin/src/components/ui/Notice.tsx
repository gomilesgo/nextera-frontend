import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Tone = "error" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-ember/40 bg-ember/10 text-parchment",
  info: "border-lagoon/30 bg-lagoon/5 text-parchment",
  success: "border-moss/40 bg-moss/10 text-parchment",
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("rounded-[3px] border px-3 py-2 text-sm", tones[tone])}
    >
      {children}
    </div>
  );
}
