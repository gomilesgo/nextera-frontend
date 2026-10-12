import { queryOptions } from "@tanstack/react-query";
import type { AdminCustomerDetail, AdminCustomerList, CustomerLedgerPage } from "@nextera/contracts";
import {
  customerFiltersBackendSearch,
  ledgerFiltersBackendSearch,
} from "@/lib/customers/filters";
import type { CustomerFilters, LedgerFilters } from "@/lib/customers/filters";
import { withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const CUSTOMERS_STALE_MS = 30_000;
export const MONEY_STALE_MS = 10_000;

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  detail: (customerId: string) => [...customerKeys.all, "detail", customerId] as const,
  ledgers: (customerId: string) => [...customerKeys.all, "ledger", customerId] as const,
  ledger: (customerId: string, filters: LedgerFilters) => [...customerKeys.ledgers(customerId), filters] as const,
};

function customerPath(customerId: string, suffix = ""): string {
  return `/api/customers/${encodeURIComponent(customerId)}${suffix}`;
}

export function ledgerExportUrl(customerId: string, account?: string): string {
  return withSearch(customerPath(customerId, "/ledger/export"), account ? new URLSearchParams({ account }).toString() : "");
}

export const customerQueries = {
  list: (filters: CustomerFilters) =>
    queryOptions({
      queryKey: customerKeys.list(filters),
      queryFn: () => fetchJson<AdminCustomerList>(withSearch("/api/customers", customerFiltersBackendSearch(filters))),
      staleTime: CUSTOMERS_STALE_MS,
    }),
  detail: (customerId: string) =>
    queryOptions({
      queryKey: customerKeys.detail(customerId),
      queryFn: () => fetchJson<AdminCustomerDetail>(customerPath(customerId)),
      staleTime: MONEY_STALE_MS,
      refetchOnWindowFocus: "always",
    }),
  ledger: (customerId: string, filters: LedgerFilters) =>
    queryOptions({
      queryKey: customerKeys.ledger(customerId, filters),
      queryFn: () =>
        fetchJson<CustomerLedgerPage>(withSearch(customerPath(customerId, "/ledger"), ledgerFiltersBackendSearch(filters))),
      staleTime: MONEY_STALE_MS,
      refetchOnWindowFocus: "always",
    }),
};
