import type { ReactNode, Ref } from "react";

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <dl className="hairline grid gap-x-6 gap-y-4 rounded-[3px] bg-horizon/40 p-5 sm:grid-cols-2 lg:grid-cols-4">{children}</dl>
  );
}

export function DetailItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

export function Section({
  id,
  title,
  children,
  aside,
  headingRef,
}: {
  id: string;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="eyebrow outline-none">
          {title}
        </h2>
        {aside ? <div className="text-xs text-dust">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
