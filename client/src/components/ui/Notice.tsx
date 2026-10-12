import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Tone = "error" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-ember/45 bg-ember/10",
  info: "border-lagoon/30 bg-lagoon/5",
  success: "border-moss/40 bg-moss/10",
};

const marks: Record<Tone, string> = {
  error: "bg-ember",
  info: "bg-lagoon",
  success: "bg-moss",
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex gap-3 rounded-[2px] border px-4 py-3 text-sm leading-6 text-parchment", tones[tone], className)}
    >
      <span aria-hidden="true" className={cx("mt-2 size-1.5 shrink-0 rounded-full", marks[tone])} />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={title ? "text-parchment/80" : undefined}>{children}</div>
      </div>
    </div>
  );
}
