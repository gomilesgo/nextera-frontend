import "server-only";
import type { BankReviewQuery } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { readBackend, unwrapForPage } from "@/lib/backend/read";
import type { BankQueueResponse } from "@/lib/queries/options";
import { isListOf, isRecord } from "@/lib/shape";
import { isAdminBankAccount } from "./shape";

export function fetchBankQueue(token: string, query: BankReviewQuery): Promise<BackendResult<BankQueueResponse>> {
  const params = new URLSearchParams({ status: query.status, limit: String(query.limit) });
  return readBackend(
    token,
    `/v1/admin/bank-accounts?${params.toString()}`,
    (data) => (isRecord(data) && isListOf(data.items, isAdminBankAccount) ? { items: data.items } : null),
    "bank review queue",
  );
}

export async function loadBankQueue(token: string, query: BankReviewQuery): Promise<BankQueueResponse> {
  return unwrapForPage(await fetchBankQueue(token, query)) ?? { items: [] };
}
