"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BrandLink } from "@/components/brand/BrandLink";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { formatIndianMobile } from "@/lib/phone";
import { useLogout } from "@/lib/queries/mutations";
import { meQuery } from "@/lib/queries/options";
import { portalNav } from "@/lib/site";

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalHeader() {
  const pathname = usePathname();
  const { data } = useQuery(meQuery());
  const customer = data?.customer;
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 border-b border-parchment/10 bg-inkwell/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <BrandLink href="/portal" compact />
          <nav aria-label="Portal" className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {portalNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "inline-flex min-h-9 items-center rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                        active ? "bg-parchment/10 text-gold" : "text-parchment/70 hover:text-parchment",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {customer ? (
            <Link
              href="/portal/profile"
              className="hidden min-w-0 rounded-[2px] text-right outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-lagoon/70 sm:block"
            >
              <span className="block truncate text-sm text-parchment">{customer.name ?? "Signed in"}</span>
              <span className="block font-mono text-[11px] text-dust tnum">{formatIndianMobile(customer.phone)}</span>
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-busy={logout.isPending}
          >
            {logout.isPending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
      <nav aria-label="Portal" className="border-t border-parchment/10 xl:hidden">
        <ul className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-3 py-2">
          {portalNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-h-10 items-center justify-center whitespace-nowrap rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.14em]",
                    active ? "bg-parchment/10 text-gold" : "text-parchment/70",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {logout.isError ? (
        <p role="alert" className="mx-auto max-w-[1320px] px-4 pb-3 text-sm text-ember sm:px-6 md:px-8">
          We could not sign you out. Please try again.
        </p>
      ) : null}
    </header>
  );
}
