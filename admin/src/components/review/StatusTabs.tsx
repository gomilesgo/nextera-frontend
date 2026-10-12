import Link from "next/link";
import { cx } from "@/lib/cx";

export function StatusTabs<T extends string>({
  label,
  basePath,
  options,
  current,
}: {
  label: string;
  basePath: string;
  options: readonly { value: T; label: string }[];
  current: T;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const active = option.value === current;
        return (
          <Link
            key={option.value}
            href={`${basePath}?status=${option.value}`}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-[3px] px-3 py-1.5 text-xs transition-colors",
              active ? "hairline bg-ink text-parchment" : "text-dust hover:bg-horizon hover:text-parchment",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
