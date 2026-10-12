import "server-only";
import type { KycQueueQuery } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { notFound, readBackend, unwrapForPage } from "@/lib/backend/read";
import type { CustomerKycDetailResponse, KycQueueResponse } from "@/lib/queries/options";
import { isListOf, isRecord, isUuid } from "@/lib/shape";
import { isAdminCustomerKyc, isKycQueueItem } from "./shape";

function queuePath(query: KycQueueQuery): string {
  const params = new URLSearchParams({ status: query.status, limit: String(query.limit) });
  return `/v1/admin/kyc?${params.toString()}`;
}

export function fetchKycQueue(token: string, query: KycQueueQuery): Promise<BackendResult<KycQueueResponse>> {
  return readBackend(
    token,
    queuePath(query),
    (data) => (isRecord(data) && isListOf(data.items, isKycQueueItem) ? { items: data.items } : null),
    "KYC queue",
  );
}

export async function fetchCustomerKyc(
  token: string,
  customerId: string,
): Promise<BackendResult<CustomerKycDetailResponse>> {
  if (!isUuid(customerId)) return notFound("Customer not found");
  return readBackend(
    token,
    `/v1/admin/customers/${customerId}/kyc`,
    (data) => (isAdminCustomerKyc(data) ? data : null),
    "KYC record",
  );
}

export async function loadKycQueue(token: string, query: KycQueueQuery): Promise<KycQueueResponse> {
  return unwrapForPage(await fetchKycQueue(token, query)) ?? { items: [] };
}

export async function loadCustomerKyc(token: string, customerId: string): Promise<CustomerKycDetailResponse | null> {
  return unwrapForPage(await fetchCustomerKyc(token, customerId));
}
