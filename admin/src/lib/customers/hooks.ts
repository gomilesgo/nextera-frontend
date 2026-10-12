import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { auditQueries } from "@/lib/queries/audit";
import { customerQueries } from "@/lib/queries/customers";
import type { AuditFilters } from "@/lib/audit/filters";
import { withSearch } from "@/lib/listing/params";
import type { CustomerFilters, LedgerFilters } from "./filters";

export function useCustomers(filters: CustomerFilters) {
  return useQuery({ ...customerQueries.list(filters), placeholderData: keepPreviousData });
}

export function useCustomer(customerId: string) {
  return useQuery(customerQueries.detail(customerId));
}

export function useCustomerLedger(customerId: string, filters: LedgerFilters) {
  return useQuery({ ...customerQueries.ledger(customerId, filters), placeholderData: keepPreviousData });
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({ ...auditQueries.list(filters), placeholderData: keepPreviousData });
}

export function useAuditEntry(entryId: string | undefined) {
  return useQuery({ ...auditQueries.detail(entryId ?? ""), enabled: Boolean(entryId) });
}

export function useUrlState<T>(parse: (params: URLSearchParams) => T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const search = searchParams.toString();
  const value = useMemo(() => parse(new URLSearchParams(search)), [parse, search]);
  const navigate = useCallback(
    (nextSearch: string, options: { replace?: boolean } = {}) => {
      const url = withSearch(pathname, nextSearch);
      if (options.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [pathname],
  );
  return { value, search, navigate };
}
