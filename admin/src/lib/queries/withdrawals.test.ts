import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "./client";
import { withdrawalKeys, withdrawalQueries } from "./withdrawals";
import { queryKeys } from "./keys";
import type { WithdrawalListFilters } from "@/lib/withdrawals/filters";
import type { AdminWithdrawal } from "@nextera/contracts";
import { withdrawal, withdrawalId, batchId, batch } from "@/test/withdrawals";
import { customerId } from "@/test/fixtures";

const original = globalThis.fetch;

function recordFetches() {
  const urls: string[] = [];
  globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
    urls.push(String(input));
    return Response.json({});
  });
  return urls;
}

function context(queryKey: readonly unknown[], pageParam?: string | null) {
  return { signal: new AbortController().signal, meta: undefined, client: makeQueryClient(), queryKey, pageParam } as never;
}

afterEach(() => {
  globalThis.fetch = original;
});

const emptyFilters: WithdrawalListFilters = {};
const statusFilter: WithdrawalListFilters = { status: "requested" };

describe("withdrawalKeys", () => {
  it("nests correctly so invalidating all clears everything", () => {
    const all = withdrawalKeys.all;
    expect(withdrawalKeys.lists()).toEqual([...all, "list"]);
    expect(withdrawalKeys.list(emptyFilters)).toEqual([...all, "list", emptyFilters]);
    expect(withdrawalKeys.details()).toEqual([...all, "detail"]);
    expect(withdrawalKeys.detail(withdrawalId)).toEqual([...all, "detail", withdrawalId]);
    expect(withdrawalKeys.batches()).toEqual([...all, "batches"]);
    expect(withdrawalKeys.batchList()).toEqual([...all, "batches", "list"]);
    expect(withdrawalKeys.batchDetail(batchId)).toEqual([...all, "batches", "detail", batchId]);
    expect(queryKeys.withdrawals).toBe(withdrawalKeys);
  });

  it("different filters produce different keys", () => {
    expect(withdrawalKeys.list(emptyFilters)).not.toEqual(withdrawalKeys.list(statusFilter));
  });
});

describe("withdrawalQueries.list", () => {
  it("reads through the same-origin route handler with filters", async () => {
    const urls = recordFetches();
    const opts = withdrawalQueries.list({ status: "approved", customerId });
    await opts.queryFn?.(context(opts.queryKey, null));
    await opts.queryFn?.(context(opts.queryKey, "abc=="));
    expect(urls).toEqual([
      `/api/withdrawals?status=approved&customerId=${customerId}&limit=50`,
      `/api/withdrawals?status=approved&customerId=${customerId}&cursor=abc%3D%3D&limit=50`,
    ]);
  });

  it("does not poll when no withdrawals are processing", () => {
    const opts = withdrawalQueries.list(emptyFilters);
    const interval = typeof opts.refetchInterval === "function"
      ? (opts.refetchInterval as (q: unknown) => unknown)({ state: { data: { pages: [{ withdrawals: [{ ...withdrawal, status: "paid" }], nextCursor: null }] } } })
      : opts.refetchInterval;
    expect(interval).toBe(false);
  });

  it("polls every 30 s when a withdrawal is processing", () => {
    const opts = withdrawalQueries.list(emptyFilters);
    const interval = typeof opts.refetchInterval === "function"
      ? (opts.refetchInterval as (q: unknown) => unknown)({ state: { data: { pages: [{ withdrawals: [{ ...withdrawal, status: "processing" }], nextCursor: null }] } } })
      : opts.refetchInterval;
    expect(interval).toBe(30_000);
  });
});

describe("withdrawalQueries.detail", () => {
  it("reads the detail route handler", async () => {
    const urls = recordFetches();
    await withdrawalQueries.detail(withdrawalId).queryFn?.(context(withdrawalKeys.detail(withdrawalId)));
    expect(urls).toEqual([`/api/withdrawals/${withdrawalId}`]);
  });

  it("polls when processing", () => {
    const opts = withdrawalQueries.detail(withdrawalId);
    const data = { withdrawal: { ...withdrawal, status: "processing" } as AdminWithdrawal };
    const interval = typeof opts.refetchInterval === "function"
      ? (opts.refetchInterval as (q: unknown) => unknown)({ state: { data } })
      : opts.refetchInterval;
    expect(interval).toBe(30_000);
  });

  it("does not poll when paid", () => {
    const opts = withdrawalQueries.detail(withdrawalId);
    const data = { withdrawal: { ...withdrawal, status: "paid" } as AdminWithdrawal };
    const interval = typeof opts.refetchInterval === "function"
      ? (opts.refetchInterval as (q: unknown) => unknown)({ state: { data } })
      : opts.refetchInterval;
    expect(interval).toBe(false);
  });
});

describe("withdrawalQueries.batchDetail", () => {
  it("reads the batch detail route handler", async () => {
    const urls = recordFetches();
    await withdrawalQueries.batchDetail(batchId).queryFn?.(context(withdrawalKeys.batchDetail(batchId)));
    expect(urls).toEqual([`/api/withdrawals/batches/${batchId}`]);
  });

  it("polls when submitted", () => {
    const opts = withdrawalQueries.batchDetail(batchId);
    const data = { batch: { ...batch, status: "submitted" } };
    const interval = typeof opts.refetchInterval === "function"
      ? (opts.refetchInterval as (q: unknown) => unknown)({ state: { data } })
      : opts.refetchInterval;
    expect(interval).toBe(30_000);
  });

  it("does not poll when failed", () => {
    const opts = withdrawalQueries.batchDetail(batchId);
    const data = { batch: { ...batch, status: "failed" } };
    const interval = typeof opts.refetchInterval === "function"
      ? (opts.refetchInterval as (q: unknown) => unknown)({ state: { data } })
      : opts.refetchInterval;
    expect(interval).toBe(false);
  });
});
