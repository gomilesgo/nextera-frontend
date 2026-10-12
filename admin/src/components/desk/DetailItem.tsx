import type { ReactNode } from "react";

export function DetailItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}
