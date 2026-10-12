import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { FAST_POLL_MS, SLOW_POLL_MS } from "@/lib/paymentPolling";
import { documentFileUrl, documentsQuery, investmentFileUrl } from "./documents";
import { investmentQuery, investmentSummaryQuery, investmentsQuery, paymentStatusQuery } from "./investments";
import { queryKeys } from "./keys";
import { statementsQuery, statementsUrl } from "./statements";

const ID = "6f1c2a0e-3b4d-4c5e-8f90-123456789abc";

describe("investment query keys", () => {
  it("nest under investments.all so one invalidation refreshes list, summary, detail and payment", () => {
    const prefix = queryKeys.investments.all();
    expect(prefix).toEqual(["nextera", "investments"]);
    for (const key of [
      queryKeys.investments.list(),
      queryKeys.investments.summary(),
      queryKeys.investments.detail(ID),
      queryKeys.investments.payment(ID),
    ]) {
      expect(key.slice(0, prefix.length)).toEqual(prefix);
    }
    expect(queryKeys.documents.list()).toEqual(["nextera", "documents", "list"]);
    expect(queryKeys.statements.list()).toEqual(["nextera", "statements", "list"]);
  });

  it("are shared by the options used for server prefetch and client hooks", () => {
    expect(investmentsQuery().queryKey).toEqual(queryKeys.investments.list());
    expect(investmentSummaryQuery().queryKey).toEqual(queryKeys.investments.summary());
    expect(investmentQuery(ID).queryKey).toEqual(queryKeys.investments.detail(ID));
    expect(paymentStatusQuery(ID, { startedAt: 0 }).queryKey).toEqual(queryKeys.investments.payment(ID));
    expect(documentsQuery().queryKey).toEqual(queryKeys.documents.list());
    expect(statementsQuery().queryKey).toEqual(queryKeys.statements.list());
  });

  it("refetch money views on window focus, except the paged statement", () => {
    expect(investmentsQuery().refetchOnWindowFocus).toBe(true);
    expect(investmentSummaryQuery().refetchOnWindowFocus).toBe(true);
    expect(investmentQuery(ID).refetchOnWindowFocus).toBe(true);
    expect(statementsQuery().refetchOnWindowFocus).toBe(false);
  });
});

describe("file and page URLs", () => {
  it("point at the same-origin handlers", () => {
    expect(documentFileUrl({ id: ID })).toBe(`/api/documents/${ID}/file`);
    expect(documentFileUrl({ id: ID }, true)).toBe(`/api/documents/${ID}/file?download=1`);
    expect(investmentFileUrl(ID, "agreement")).toBe(`/api/investments/${ID}/agreement`);
    expect(investmentFileUrl(ID, "bond", true)).toBe(`/api/investments/${ID}/bond?download=1`);
    expect(statementsUrl(null)).toBe("/api/statements");
    expect(statementsUrl("42")).toBe("/api/statements?cursor=42");
  });
});

describe("statementsQuery", () => {
  it("pages with the backend cursor until it runs out", async () => {
    const load = vi.fn(async (cursor: string | null) =>
      cursor === null ? { entries: [], nextCursor: "40" } : { entries: [], nextCursor: null },
    );
    const client = new QueryClient();
    const options = statementsQuery(load);

    const data = await client.fetchInfiniteQuery({ ...options, pages: 3 });

    expect(load).toHaveBeenCalledWith(null, expect.anything());
    expect(load).toHaveBeenCalledWith("40", expect.anything());
    expect(data.pages.at(-1)?.nextCursor).toBeNull();
  });
});

type IntervalFn = (query: { state: { data?: unknown; error: unknown } }) => number | false;

function intervalOf(startedAt: number, now: number) {
  const options = paymentStatusQuery(ID, { startedAt, now: () => now });
  return options.refetchInterval as unknown as IntervalFn;
}

const pending = {
  investment: { status: "pending_payment", consentedAt: "2026-10-01T00:00:00Z", bondNo: null },
  payment: { status: "created" },
};

describe("paymentStatusQuery polling", () => {
  it("polls fast at first, then slower, then stops", () => {
    expect(intervalOf(0, 1_000)({ state: { data: pending, error: null } })).toBe(FAST_POLL_MS);
    expect(intervalOf(0, 5 * 60_000)({ state: { data: pending, error: null } })).toBe(SLOW_POLL_MS);
    expect(intervalOf(0, 16 * 60_000)({ state: { data: pending, error: null } })).toBe(false);
  });

  it("keeps polling before the first response arrives", () => {
    expect(intervalOf(0, 0)({ state: { data: undefined, error: null } })).toBe(FAST_POLL_MS);
  });

  it("stops on a terminal state and on client errors", () => {
    const paid = { investment: { status: "active", consentedAt: "x", bondNo: "NXB-2026-000001" }, payment: { status: "paid" } };
    expect(intervalOf(0, 1_000)({ state: { data: paid, error: null } })).toBe(false);
    const expired = { ...pending, payment: { status: "expired" } };
    expect(intervalOf(0, 1_000)({ state: { data: expired, error: null } })).toBe(false);
    expect(intervalOf(0, 1_000)({ state: { data: pending, error: new ApiError(404, "not_found", "x") } })).toBe(false);
    expect(intervalOf(0, 1_000)({ state: { data: pending, error: new ApiError(503, "unavailable", "x") } })).toBe(FAST_POLL_MS);
  });
});
