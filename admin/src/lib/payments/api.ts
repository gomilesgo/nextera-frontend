import "server-only";
import type { AdminPaymentQuery, PaymentFlagQuery } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { notFound, readBackend, unwrapForPage } from "@/lib/backend/read";
import type { FlagDetailResponse, FlagListResponse, PaymentDetailResponse, PaymentListResponse } from "@/lib/queries/payments";
import { toSearchString, withSearch } from "@/lib/listing/params";
import { isListOf, isRecord, isUuid } from "@/lib/shape";
import { isAdminPayment, isPaymentEvent, isPaymentFlag } from "./shape";

function paymentsPath(query: AdminPaymentQuery): string {
  return withSearch(
    "/v1/admin/payments",
    toSearchString({ status: query.status, investmentId: query.investmentId, limit: query.limit }),
  );
}

function flagsPath(query: PaymentFlagQuery): string {
  return withSearch("/v1/admin/payments/flags", toSearchString({ state: query.state, limit: query.limit }));
}

export function fetchPayments(token: string, query: AdminPaymentQuery): Promise<BackendResult<PaymentListResponse>> {
  return readBackend(
    token,
    paymentsPath(query),
    (data) => (isRecord(data) && isListOf(data.payments, isAdminPayment) ? { payments: data.payments } : null),
    "payment list",
  );
}

export function fetchFlags(token: string, query: PaymentFlagQuery): Promise<BackendResult<FlagListResponse>> {
  return readBackend(
    token,
    flagsPath(query),
    (data) => (isRecord(data) && isListOf(data.flags, isPaymentFlag) && typeof data.total === "number" ? { flags: data.flags, total: data.total } : null),
    "payment flag list",
  );
}

function isFlagDetailResponse(data: unknown): data is FlagDetailResponse {
  return (
    isRecord(data) &&
    isPaymentEvent(data.flag) &&
    (data.payment === null || isAdminPayment(data.payment))
  );
}

function isPaymentDetailResponse(data: unknown): data is PaymentDetailResponse {
  return isRecord(data) && isAdminPayment(data.payment);
}

export function fetchFlagDetail(token: string, id: string): Promise<BackendResult<FlagDetailResponse>> {
  if (!isUuid(id)) return Promise.resolve(notFound("Payment flag not found"));
  return readBackend(
    token,
    `/v1/admin/payments/flags/${encodeURIComponent(id)}`,
    (data) => (isFlagDetailResponse(data) ? data : null),
    "payment flag detail",
  );
}

export function fetchPaymentById(token: string, id: string): Promise<BackendResult<PaymentDetailResponse>> {
  if (!isUuid(id)) return Promise.resolve(notFound("Payment not found"));
  return readBackend(
    token,
    `/v1/admin/payments/${encodeURIComponent(id)}`,
    (data) => (isPaymentDetailResponse(data) ? data : null),
    "payment",
  );
}


export async function loadPayments(token: string, query: AdminPaymentQuery): Promise<PaymentListResponse> {
  return unwrapForPage(await fetchPayments(token, query)) ?? { payments: [] };
}

export async function loadFlags(token: string, query: PaymentFlagQuery): Promise<FlagListResponse> {
  return unwrapForPage(await fetchFlags(token, query)) ?? { flags: [], total: 0 };
}

export async function loadFlagDetail(token: string, id: string): Promise<FlagDetailResponse | null> {
  return unwrapForPage(await fetchFlagDetail(token, id));
}

export async function loadPaymentDetail(token: string, id: string): Promise<PaymentDetailResponse | null> {
  return unwrapForPage(await fetchPaymentById(token, id));
}

