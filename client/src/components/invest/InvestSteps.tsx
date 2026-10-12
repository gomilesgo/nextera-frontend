import { cx } from "@/lib/cx";

const STEPS = ["Amount", "Agreement", "Payment"] as const;

export function InvestSteps({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Investment steps">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cx(
              "border-t-2 pt-3 font-mono text-[10.5px] uppercase tracking-[0.14em]",
              done ? "border-moss text-moss" : active ? "border-gold text-gold" : "border-parchment/15 text-dust",
            )}
          >
            <span className="tnum">{index + 1}.</span> {label}
            <span className="sr-only">{done ? ", done" : active ? ", current step" : ", not started"}</span>
          </li>
        );
      })}
    </ol>
  );
}
