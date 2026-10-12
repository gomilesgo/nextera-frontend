"use client";

import Link from "next/link";
import { CreateCustomerButton } from "@/components/customers/CreateCustomerDialog";
import { CustomerKycBadge, CustomerStatusBadge } from "@/components/customers/CustomerBadges";
import { CustomerFiltersForm } from "@/components/customers/CustomerFiltersForm";
import { Pagination } from "@/components/listing/Pagination";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { customerFiltersSearch, hasCustomerFilters, parseCustomerFilters } from "@/lib/customers/filters";
import type { CustomerFilters } from "@/lib/customers/filters";
import { useCustomers, useUrlState } from "@/lib/customers/hooks";
import { originLabels } from "@/lib/customers/labels";
import { formatDate } from "@/lib/format";
import { formatIndianMobile } from "@/lib/customers/phone";

export function CustomersView({ canWrite }: { canWrite: boolean }) {
  const { value: filters, search, navigate } = useUrlState(parseCustomerFilters);
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useCustomers(filters);
  const filtered = hasCustomerFilters(filters);

  function apply(next: CustomerFilters) {
    navigate(customerFiltersSearch({ ...next, offset: 0 }));
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Customers"
        title="Customers"
        description={
          canWrite
            ? "Search, create and manage customer accounts. Blocking and closing are recorded in the audit log."
            : "You have read-only access to customers."
        }
        actions={canWrite ? <CreateCustomerButton /> : null}
      />

      <CustomerFiltersForm key={search} filters={filters} onApply={apply} onClear={() => navigate("")} />

      {error && !data ? (
        <Notice tone="error">
          <span className="flex flex-wrap items-center justify-between gap-2">
            {error.message}
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </span>
        </Notice>
      ) : null}

      <div className="grid gap-2">
        <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
          <table className="data-table">
            <caption className="sr-only">Customers</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Mobile</th>
                <th scope="col">Status</th>
                <th scope="col">KYC</th>
                <th scope="col">Origin</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
              {isPending ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-dust">
                    Loading customers…
                  </td>
                </tr>
              ) : data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-dust">
                    {filtered ? (
                      <>
                        No customers match these filters.{" "}
                        <button type="button" className="text-gold underline" onClick={() => navigate("")}>
                          Clear filters
                        </button>
                      </>
                    ) : (
                      "No customers yet."
                    )}
                  </td>
                </tr>
              ) : (
                data?.items.map((customer) => (
                  <tr key={customer.id}>
                    <td className="max-w-72">
                      <Link href={`/customers/${customer.id}`} className="font-medium hover:text-gold">
                        {customer.name ?? "Unnamed customer"}
                      </Link>
                      <div className="truncate text-xs text-dust">{customer.email ?? "No email"}</div>
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">{formatIndianMobile(customer.phone)}</td>
                    <td>
                      <CustomerStatusBadge status={customer.status} />
                    </td>
                    <td>
                      <CustomerKycBadge status={customer.kycStatus} />
                    </td>
                    <td className="whitespace-nowrap text-dust">{originLabels[customer.createdVia]}</td>
                    <td className="whitespace-nowrap text-dust">{formatDate(customer.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          label="Customers"
          window={filters}
          total={data?.total ?? 0}
          busy={isFetching}
          onOffset={(offset) => navigate(customerFiltersSearch({ ...filters, offset }))}
        />
        <p aria-live="polite" className="min-h-4 text-xs text-ember">
          {error && data ? `Showing earlier results: ${error.message}` : ""}
        </p>
      </div>
    </div>
  );
}
