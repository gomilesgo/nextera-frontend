import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "./client";
import { investmentKeys, investmentQueries, nextInvestmentCursor } from "./investments";
import { queryKeys } from "./keys";
import { flagCountLabel, openFlagCount, paymentKeys, paymentQueries } from "./payments";
import { flag, investmentId } from "@/test/investments";
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

describe("investment keys", () => {
  it("nest under one root so a single invalidation reaches every list and detail", () => {
    expect(investmentKeys.list({ status: "active" })).toEqual(["investments", "list", { status: "active" }]);
    expect(investmentKeys.detail(investmentId)).toEqual(["investments", "detail", investmentId]);
    expect(investmentKeys.list({}).slice(0, 2)).toEqual(investmentKeys.lists());
    expect(investmentKeys.detail(investmentId).slice(0, 2)).toEqual(investmentKeys.details());
    expect(investmentKeys.lists().slice(0, 1)).toEqual(investmentKeys.all);
    expect(queryKeys.investments).toBe(investmentKeys);
  });

  it("are reused by the shared query options", () => {
    const filters = { status: "pending_payment" as const, customerId };
    expect(investmentQueries.list(filters).queryKey).toEqual(investmentKeys.list(filters));
    expect(investmentQueries.detail(investmentId).queryKey).toEqual(investmentKeys.detail(investmentId));
  });

  it("read pages through the same-origin route handler with the cursor", async () => {
    const urls = recordFetches();
    const options = investmentQueries.list({ status: "active", customerId });
    await options.queryFn?.(context(options.queryKey, null));
    await options.queryFn?.(context(options.queryKey, "abc=="));
    await investmentQueries.detail(investmentId).queryFn?.(context(investmentKeys.detail(investmentId)));
    expect(urls).toEqual([
      `/api/investments?status=active&customerId=${customerId}&limit=50`,
      `/api/investments?status=active&customerId=${customerId}&cursor=abc%3D%3D&limit=50`,
      `/api/investments/${investmentId}`,
    ]);
  });

  it("stops paging when the backend returns no cursor", () => {
    expect(nextInvestmentCursor({ investments: [], nextCursor: "c2" })).toBe("c2");
    expect(nextInvestmentCursor({ investments: [], nextCursor: null })).toBeUndefined();
    expect(investmentQueries.list({}).initialPageParam).toBeNull();
  });
});

describe("payment keys", () => {
  it("nest flags under payments so resolving a flag refreshes every payment view", () => {
    expect(paymentKeys.list({ limit: 50 })).toEqual(["payments", "list", "all", 50]);
    expect(paymentKeys.list({ status: "flagged", limit: 100 })).toEqual(["payments", "list", "flagged", 100]);
    expect(paymentKeys.flagList({ state: "open", limit: 50 })).toEqual(["payments", "flags", "list", "open", 50]);
    expect(paymentKeys.flag(flag.id)).toEqual(["payments", "flags", "detail", flag.id]);
    expect(paymentKeys.openFlagCount()).toEqual(["payments", "flags", "open-count"]);
    expect(paymentKeys.openFlagCount().slice(0, 2)).toEqual(paymentKeys.flags());
    expect(paymentKeys.flags().slice(0, 1)).toEqual(paymentKeys.all);
    expect(queryKeys.payments).toBe(paymentKeys);
  });

  it("are reused by the shared query options", () => {
    expect(paymentQueries.list({ status: "paid", limit: 50 }).queryKey).toEqual(paymentKeys.list({ status: "paid", limit: 50 }));
    expect(paymentQueries.flagList({ state: "resolved", limit: 50 }).queryKey).toEqual(
      paymentKeys.flagList({ state: "resolved", limit: 50 }),
    );
    expect(paymentQueries.flag(flag.id).queryKey).toEqual(paymentKeys.flag(flag.id));
    expect(paymentQueries.openFlagCount().queryKey).toEqual(paymentKeys.openFlagCount());
  });

  it("read through the same-origin route handlers", async () => {
    const urls = recordFetches();
    await paymentQueries.list({ limit: 50 }).queryFn?.(context(paymentKeys.list({ limit: 50 })));
    await paymentQueries.list({ status: "expired", limit: 100 }).queryFn?.(context(paymentKeys.list({ status: "expired", limit: 100 })));
    await paymentQueries.flagList({ state: "resolved", limit: 50 }).queryFn?.(context(paymentKeys.flagList({ state: "resolved", limit: 50 })));
    await paymentQueries.flag(flag.id).queryFn?.(context(paymentKeys.flag(flag.id)));
    await paymentQueries.openFlagCount().queryFn?.(context(paymentKeys.openFlagCount()));
    expect(urls).toEqual([
      "/api/payments?limit=50",
      "/api/payments?status=expired&limit=100",
      "/api/payments/flags?state=resolved&limit=50",
      `/api/payments/flags/${flag.id}`,
      "/api/payments/flags?state=open&limit=200",
    ]);
  });

  it("keeps earlier rows visible while a longer list loads", () => {
    expect(paymentQueries.list({ limit: 100 }).placeholderData).toBeDefined();
    expect(paymentQueries.flagList({ state: "open", limit: 100 }).placeholderData).toBeDefined();
  });

  it("counts open flags from the backend total and caps the label", () => {
    expect(openFlagCount({ flags: [flag, flag], total: 7 })).toBe(7);
    expect(paymentQueries.openFlagCount().select).toBe(openFlagCount);
    expect(flagCountLabel(3)).toBe("3");
    expect(flagCountLabel(200)).toBe("200+");
  });
});
