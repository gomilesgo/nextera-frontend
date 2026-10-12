import { z } from "zod";
import { customerStatuses, dateRangeIsOrdered, isoDateSchema, kycStatuses } from "@nextera/contracts";
import type { CustomerStatus, KycStatus } from "@nextera/contracts";
import { LIST_PAGE_SIZE, lenient, readPageWindow, readParam, toSearchString } from "@/lib/listing/params";
import type { PageWindow, ParamSource } from "@/lib/listing/params";

export type CustomerFilterValues = {
  status?: CustomerStatus;
  kycStatus?: KycStatus;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type CustomerFilters = CustomerFilterValues & PageWindow;

export type LedgerFilters = PageWindow & { account?: string };

export const LEDGER_PAGE_SIZE = 50;

const searchSchema = z.string().trim().min(1).max(100);
const accountSchema = z.string().trim().min(1).max(100);

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function parseCustomerFilters(source: ParamSource): CustomerFilters {
  const createdFrom = lenient(isoDateSchema, readParam(source, "createdFrom"));
  let createdTo = lenient(isoDateSchema, readParam(source, "createdTo"));
  if (!dateRangeIsOrdered(createdFrom, createdTo)) createdTo = undefined;
  return compact({
    status: lenient(z.enum(customerStatuses), readParam(source, "status")),
    kycStatus: lenient(z.enum(kycStatuses), readParam(source, "kycStatus")),
    q: lenient(searchSchema, readParam(source, "q")),
    createdFrom,
    createdTo,
    ...readPageWindow(source, LIST_PAGE_SIZE),
  });
}

export function customerFiltersSearch(filters: CustomerFilters): string {
  return toSearchString(
    {
      status: filters.status,
      kycStatus: filters.kycStatus,
      q: filters.q,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
      offset: filters.offset,
      limit: filters.limit,
    },
    { offset: 0, limit: LIST_PAGE_SIZE },
  );
}

export function customerFiltersBackendSearch(filters: CustomerFilters): string {
  return toSearchString({
    status: filters.status,
    kycStatus: filters.kycStatus,
    q: filters.q,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    limit: filters.limit,
    offset: filters.offset,
  });
}

export function hasCustomerFilters(filters: CustomerFilters): boolean {
  return Boolean(filters.status || filters.kycStatus || filters.q || filters.createdFrom || filters.createdTo);
}

export function parseLedgerFilters(source: ParamSource): LedgerFilters {
  return compact({
    account: lenient(accountSchema, readParam(source, "account")),
    ...readPageWindow(source, LEDGER_PAGE_SIZE),
  });
}

export function ledgerFiltersSearch(filters: LedgerFilters): string {
  return toSearchString(
    { account: filters.account, offset: filters.offset, limit: filters.limit },
    { offset: 0, limit: LEDGER_PAGE_SIZE },
  );
}

export function ledgerFiltersBackendSearch(filters: LedgerFilters): string {
  return toSearchString({ account: filters.account, limit: filters.limit, offset: filters.offset });
}
