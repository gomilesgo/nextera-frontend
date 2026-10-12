import type { Metadata } from "next";
import Link from "next/link";
import { formatPaise } from "@nextera/contracts";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadPayablesSummary } from "@/lib/payables/api";
import { navFor } from "@/lib/nav";
import { can } from "@/lib/permissions";
import { firstParam } from "@/lib/request";
import { requirePermission } from "@/lib/session";
import { roleLabels } from "@/lib/staff";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { staff, token } = await requirePermission("dashboard.view");
  const passwordChanged = firstParam((await searchParams).password) === "changed";
  const sections = navFor(staff.role).filter((item) => item.href !== "/");

  const payablesSummary = can(staff.role, "payables.view")
    ? await loadPayablesSummary(token).catch(() => null)
    : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome, ${staff.name}`}
        description="Use the sections below to navigate the console."
      />
      {passwordChanged ? <Notice tone="success">Your password has been updated.</Notice> : null}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="hairline rounded-[3px] bg-horizon/60 p-4">
          <dt className="eyebrow">Signed in as</dt>
          <dd className="mt-1 truncate text-sm">{staff.email}</dd>
        </div>
        <div className="hairline rounded-[3px] bg-horizon/60 p-4">
          <dt className="eyebrow">Role</dt>
          <dd className="mt-1 text-sm text-lagoon">{roleLabels[staff.role]}</dd>
        </div>
        <div className="hairline rounded-[3px] bg-horizon/60 p-4">
          <dt className="eyebrow">Plans</dt>
          <dd className="mt-1 text-sm">{can(staff.role, "plans.write") ? "Can edit" : "Read only"}</dd>
        </div>
      </dl>
      {payablesSummary ? (
        <section aria-labelledby="dashboard-payables-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="dashboard-payables-heading" className="eyebrow">
              Payables snapshot
            </h2>
            <Link href="/payables" className="text-xs text-dust hover:text-parchment">
              Open payables →
            </Link>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="hairline rounded-[3px] bg-horizon/60 p-4">
              <dt className="eyebrow">Total wallet</dt>
              <dd className="mt-1 font-mono text-sm text-gold">
                {formatPaise(payablesSummary.summary.totalWalletPaise)}
              </dd>
            </div>
            <div className="hairline rounded-[3px] bg-horizon/60 p-4">
              <dt className="eyebrow">Pending withdrawals</dt>
              <dd className="mt-1 font-mono text-sm">
                {formatPaise(payablesSummary.summary.pendingWithdrawals.totalPaise)}
              </dd>
            </div>
            <div className="hairline rounded-[3px] bg-horizon/60 p-4">
              <dt className="eyebrow">Returns due (30 days)</dt>
              <dd className="mt-1 font-mono text-sm">
                {formatPaise(payablesSummary.summary.returnsDue30.netPaise)}
              </dd>
            </div>
            <div className="hairline rounded-[3px] bg-horizon/60 p-4">
              <dt className="eyebrow">Maturing in 30 days</dt>
              <dd className="mt-1 font-mono text-sm">
                {formatPaise(payablesSummary.summary.principalMaturing30Paise)}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      {sections.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sections.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="hairline block rounded-[3px] px-4 py-3 text-sm hover:bg-horizon"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
