import "server-only";
import { cache } from "react";
import type { AdminCustomerDetail, AdminCustomerList, CustomerLedgerPage } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { callBackend } from "@/lib/backend/server";
import { checkShape, unwrapForPage } from "@/lib/backend/read";
import { withSearch } from "@/lib/listing/params";
import { customerFiltersBackendSearch, ledgerFiltersBackendSearch } from "./filters";
import type { CustomerFilters, LedgerFilters } from "./filters";
import { isCustomerDetail, isCustomerId, isCustomerList, isLedgerPage } from "./shape";

const notFound: BackendResult<never> = {
  ok: false,
  status: 404,
  error: { code: "not_found", message: "Customer not found" },
};

export function customerBackendPath(customerId: string, suffix = ""): string {
  return `/v1/admin/customers/${encodeURIComponent(customerId)}${suffix}`;
}

export async function fetchCustomers(token: string, filters: CustomerFilters): Promise<BackendResult<AdminCustomerList>> {
  const result = await callBackend<unknown>(withSearch("/v1/admin/customers", customerFiltersBackendSearch(filters)), {
    token,
  });
  return checkShape(result, isCustomerList, "customer list");
}

export async function fetchCustomer(token: string, customerId: string): Promise<BackendResult<AdminCustomerDetail>> {
  if (!isCustomerId(customerId)) return notFound;
  const result = await callBackend<unknown>(customerBackendPath(customerId), { token });
  return checkShape(result, isCustomerDetail, "customer");
}

export async function fetchCustomerLedger(
  token: string,
  customerId: string,
  filters: LedgerFilters,
): Promise<BackendResult<CustomerLedgerPage>> {
  if (!isCustomerId(customerId)) return notFound;
  const result = await callBackend<unknown>(
    withSearch(customerBackendPath(customerId, "/ledger"), ledgerFiltersBackendSearch(filters)),
    { token },
  );
  return checkShape(result, isLedgerPage, "ledger page");
}

export async function loadCustomers(token: string, filters: CustomerFilters): Promise<AdminCustomerList> {
  return unwrapForPage(await fetchCustomers(token, filters)) ?? { items: [], total: 0, limit: filters.limit, offset: filters.offset };
}

export const loadCustomer = cache(async (token: string, customerId: string): Promise<AdminCustomerDetail | null> =>
  unwrapForPage(await fetchCustomer(token, customerId)),
);

export async function loadCustomerLedger(
  token: string,
  customerId: string,
  filters: LedgerFilters,
): Promise<CustomerLedgerPage | null> {
  return unwrapForPage(await fetchCustomerLedger(token, customerId, filters));
}
