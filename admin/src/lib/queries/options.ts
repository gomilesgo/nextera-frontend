import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type {
  AdminBankAccount,
  AdminCustomerKyc,
  AssignableStaffResponse,
  BankReviewQuery,
  KycQueueItem,
  KycQueueQuery,
  Plan,
  Settings,
  StaffMember,
} from "@nextera/contracts";
import type { AdminStaff } from "@/lib/staff";
import { ApiError, fetchJson } from "./fetchJson";
import { queryKeys } from "./keys";

export const MAX_READ_RETRIES = 2;
export const SESSION_STALE_MS = 60_000;
export const PLANS_STALE_MS = 30_000;
export const QUEUE_STALE_MS = 15_000;
export const ADMIN_STALE_MS = 30_000;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_READ_RETRIES;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function needsPasswordChange(error: unknown): boolean {
  return error instanceof ApiError && error.code === "password_change_required";
}

export type MeResponse = { staff: AdminStaff };
export type PlansResponse = { plans: Plan[] };
export type PlanResponse = { plan: Plan };
export type KycQueueResponse = { items: KycQueueItem[] };
export type CustomerKycDetailResponse = AdminCustomerKyc;
export type BankQueueResponse = { items: AdminBankAccount[] };
export type StaffListResponse = { staff: StaffMember[] };
export type SettingsResponse = { settings: Settings };

function search(values: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) params.set(key, String(value));
  return params.toString();
}

export const sessionQueries = {
  me: () =>
    queryOptions({
      queryKey: queryKeys.session.me(),
      queryFn: () => fetchJson<MeResponse>("/api/session/me"),
      staleTime: SESSION_STALE_MS,
    }),
};

export const planQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.plans.list(),
      queryFn: () => fetchJson<PlansResponse>("/api/plans"),
      staleTime: PLANS_STALE_MS,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.plans.detail(id),
      queryFn: () => fetchJson<PlanResponse>(`/api/plans/${encodeURIComponent(id)}`),
      staleTime: PLANS_STALE_MS,
    }),
};

export const kycQueries = {
  queue: (query: KycQueueQuery) =>
    queryOptions({
      queryKey: queryKeys.kyc.queue(query),
      queryFn: () => fetchJson<KycQueueResponse>(`/api/kyc?${search(query)}`),
      staleTime: QUEUE_STALE_MS,
      placeholderData: keepPreviousData,
    }),
  customer: (customerId: string) =>
    queryOptions({
      queryKey: queryKeys.kyc.customer(customerId),
      queryFn: () => fetchJson<CustomerKycDetailResponse>(`/api/kyc/${encodeURIComponent(customerId)}`),
      staleTime: QUEUE_STALE_MS,
    }),
};

export const bankQueries = {
  queue: (query: BankReviewQuery) =>
    queryOptions({
      queryKey: queryKeys.bank.queue(query),
      queryFn: () => fetchJson<BankQueueResponse>(`/api/bank-accounts?${search(query)}`),
      staleTime: QUEUE_STALE_MS,
      placeholderData: keepPreviousData,
    }),
};

export const staffQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.staff.list(),
      queryFn: () => fetchJson<StaffListResponse>("/api/staff"),
      staleTime: ADMIN_STALE_MS,
    }),
  assignable: () =>
    queryOptions({
      queryKey: queryKeys.staff.assignable(),
      queryFn: () => fetchJson<AssignableStaffResponse>("/api/staff/assignable"),
      staleTime: ADMIN_STALE_MS,
    }),
};

export const settingsQueries = {
  current: () =>
    queryOptions({
      queryKey: queryKeys.settings.current(),
      queryFn: () => fetchJson<SettingsResponse>("/api/settings"),
      staleTime: ADMIN_STALE_MS,
    }),
};
