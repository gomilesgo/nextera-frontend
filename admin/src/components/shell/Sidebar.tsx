"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(console)/actions";
import { OpenFlagsBadge } from "@/components/payments/OpenFlagsBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cx } from "@/lib/cx";
import { isActive, navFor } from "@/lib/nav";
import { useStaff } from "@/lib/queries/hooks";
import { roleLabels } from "@/lib/staff";

export function Sidebar() {
  const pathname = usePathname();
  const { staff } = useStaff();
  const items = staff && !staff.mustChangePassword ? navFor(staff.role) : [];

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-horizon/50 md:sticky md:top-0 md:h-dvh md:w-56 md:border-r md:border-b-0">
      <div className="px-4 pt-5 pb-4">
        <p className="eyebrow">Srahira</p>
        <p className="mt-0.5 text-base font-semibold tracking-tight">
          Nextera <span className="text-gold">Admin</span>
        </p>
      </div>
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-visible">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "rounded-[3px] px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-ink text-parchment shadow-[inset_2px_0_0_var(--color-gold)]"
                  : "text-dust hover:bg-ink/60 hover:text-parchment",
              )}
            >
              {item.label}
              {item.href === "/payment-flags" ? <OpenFlagsBadge /> : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3 md:py-4">
        {staff ? (
          <>
            <p className="truncate text-sm font-medium">{staff.name}</p>
            <p className="truncate text-xs text-dust">{staff.email}</p>
            <p className="eyebrow mt-1 text-lagoon">{roleLabels[staff.role]}</p>
          </>
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          <Link href="/account/password" className="text-xs text-dust hover:text-parchment">
            Password
          </Link>
          <form action={logout} className="ml-auto">
            <SubmitButton variant="ghost" size="sm" pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </div>
    </aside>
  );
}
