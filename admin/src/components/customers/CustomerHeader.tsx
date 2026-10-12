"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CustomerKycBadge, CustomerStatusBadge } from "@/components/customers/CustomerBadges";
import { ManualAdjustmentButton } from "@/components/customers/ManualAdjustmentDialog";
import { StatusChangeDialog } from "@/components/customers/StatusChangeDialog";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { CustomerAccess } from "@/lib/customers/access";
import { walletBalance } from "@/lib/customers/adjustment";
import type { CustomerStatusAction } from "@/lib/customers/form";
import { useCustomer } from "@/lib/customers/hooks";
import { formatDate } from "@/lib/format";
import { originLabels } from "@/lib/customers/labels";
import { formatIndianMobile } from "@/lib/customers/phone";
import { cx } from "@/lib/cx";
import { toSearchString, withSearch } from "@/lib/listing/params";

export function CustomerHeader({ customerId, access }: { customerId: string; access: CustomerAccess }) {
  const { data, error } = useCustomer(customerId);
  const [action, setAction] = useState<CustomerStatusAction | null>(null);

  if (!data) return <Notice tone="error">{error?.message ?? "Customer not found"}</Notice>;

  const { customer } = data;
  const name = customer.name ?? "Unnamed customer";
  const closed = customer.status === "closed";
  const auditHref = withSearch("/audit", toSearchString({ entity: "customer", entityId: customer.id }));

  return (
    <header className="grid gap-4 border-b border-border pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">
            <Link href="/customers" className="hover:text-parchment">
              Customers
            </Link>
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dust">
            <span className="font-mono text-parchment">{formatIndianMobile(customer.phone)}</span>
            <span>{originLabels[customer.createdVia]}</span>
            <span>Since {formatDate(customer.createdAt)}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CustomerStatusBadge status={customer.status} />
            <CustomerKycBadge status={customer.kycStatus} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {access.canViewAudit ? (
            <ButtonLink href={auditHref} variant="ghost" size="sm">
              Audit trail
            </ButtonLink>
          ) : null}
          {access.canAdjust && !closed ? (
            <ManualAdjustmentButton customerId={customer.id} customerName={name} walletPaise={walletBalance(data.balances)} />
          ) : null}
          {access.canWrite && customer.status === "active" ? (
            <Button variant="secondary" size="sm" onClick={() => setAction("block")}>
              Block
            </Button>
          ) : null}
          {access.canWrite && customer.status === "blocked" ? (
            <Button size="sm" onClick={() => setAction("unblock")}>
              Unblock
            </Button>
          ) : null}
          {access.canWrite && !closed ? (
            <Button variant="danger" size="sm" onClick={() => setAction("close")}>
              Close account
            </Button>
          ) : null}
        </div>
      </div>
      {closed ? <Notice tone="info">This account is closed. It is kept read-only for the record.</Notice> : null}
      <CustomerTabs customerId={customer.id} />
      {access.canWrite ? <StatusChangeDialog detail={data} action={action} onClose={() => setAction(null)} /> : null}
    </header>
  );
}

function CustomerTabs({ customerId }: { customerId: string }) {
  const pathname = usePathname();
  const base = `/customers/${customerId}`;
  const tabs = [
    { href: base, label: "Overview", active: pathname === base },
    { href: `${base}/ledger`, label: "Ledger", active: pathname.startsWith(`${base}/ledger`) },
  ];
  return (
    <nav aria-label="Customer sections" className="-mb-4 flex gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cx(
            "border-b-2 px-3 py-2 text-sm transition-colors",
            tab.active ? "border-gold text-parchment" : "border-transparent text-dust hover:text-parchment",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
