import type { MouseEvent } from "react";

export function ErrorSummary<T extends string>({
  errors,
  order,
  labels,
}: {
  errors: Partial<Record<T, string>>;
  order: readonly T[];
  labels: Record<T, string>;
}) {
  const fields = order.filter((field) => errors[field]);
  if (fields.length === 0) return null;

  function jump(event: MouseEvent<HTMLAnchorElement>, field: T) {
    const target = document.getElementById(field);
    if (!target) return;
    event.preventDefault();
    target.focus();
    target.scrollIntoView({ block: "center" });
  }

  return (
    <div role="alert" className="flex gap-3 rounded-[2px] border border-ember/45 bg-ember/10 px-4 py-3 text-sm leading-6 text-parchment">
      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
      <div className="min-w-0">
        <p className="font-medium">
          {fields.length === 1 ? "One field needs attention" : `${fields.length} fields need attention`}
        </p>
        <ul className="mt-1 grid gap-1">
          {fields.map((field) => (
            <li key={field}>
              <a href={`#${field}`} onClick={(event) => jump(event, field)} className="text-parchment/85 underline underline-offset-4 hover:text-gold">
                {labels[field]}: {errors[field]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
