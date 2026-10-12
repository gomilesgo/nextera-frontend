import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "./client";
import { analyticsKeys, analyticsQueries } from "./analytics";
import { payablesKeys, payablesQueries, PAYABLES_PAGE_SIZE, nextPayablesCursor } from "./payables";
import { queryKeys } from "./keys";

const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

function captureFetch(body: unknown) {
  const urls: string[] = [];
  globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
    urls.push(String(input));
    return Response.json(body);
  });
  return urls;
}

function context(queryKey: readonly unknown[], pageParam?: string | null) {
  return { signal: new AbortController().signal, meta: undefined, client: makeQueryClient(), queryKey, pageParam } as never;
}

describe("payablesKeys", () => {
  it("nests summary and customer lists under the payables root", () => {
    expect(payablesKeys.summary()).toEqual(["payables", "summary"]);
    expect(payablesKeys.customerList("totalPayable_desc")).toEqual([
      "payables",
      "customers",
      "totalPayable_desc",
    ]);
    expect(payablesKeys.summary().slice(0, 1)).toEqual(payablesKeys.all);
    expect(payablesKeys.customerList("totalPayable_asc").slice(0, 2)).toEqual(
      payablesKeys.customerLists(),
    );
    expect(queryKeys.payables).toBe(payablesKeys);
  });

  it("are reused by the shared query options", () => {
    expect(payablesQueries.summary().queryKey).toEqual(payablesKeys.summary());
    expect(payablesQueries.customers("totalPayable_desc").queryKey).toEqual(
      payablesKeys.customerList("totalPayable_desc"),
    );
  });

  it("refetches money views on window focus", () => {
    expect(payablesQueries.summary().refetchOnWindowFocus).toBe("always");
    expect(payablesQueries.customers("totalPayable_desc").refetchOnWindowFocus).toBe("always");
  });
});

describe("payablesQueries", () => {
  it("reads the summary through the same-origin route handler", async () => {
    const urls = captureFetch({ summary: {} });
    await payablesQueries.summary().queryFn?.(context(payablesKeys.summary()));
    expect(urls).toEqual(["/api/payables/summary"]);
  });

  it("pages customers through the same-origin route handler with the cursor", async () => {
    const urls = captureFetch({ customers: [], nextCursor: null });
    const options = payablesQueries.customers("totalPayable_desc");
    await options.queryFn?.(context(options.queryKey, null));
    await options.queryFn?.(context(options.queryKey, "some-uuid"));
    expect(urls[0]).toBe(`/api/payables/customers?limit=${PAYABLES_PAGE_SIZE}&sort=totalPayable_desc`);
    expect(urls[1]).toBe(
      `/api/payables/customers?cursor=some-uuid&limit=${PAYABLES_PAGE_SIZE}&sort=totalPayable_desc`,
    );
  });

  it("stops paging when the backend returns no cursor", () => {
    expect(
      nextPayablesCursor({ customers: [], nextCursor: "c2" }),
    ).toBe("c2");
    expect(
      nextPayablesCursor({ customers: [], nextCursor: null }),
    ).toBeUndefined();
    expect(payablesQueries.customers("totalPayable_desc").initialPageParam).toBeNull();
  });
});

describe("analyticsKeys", () => {
  it("nests overviews under the analytics root", () => {
    const query = { from: "2026-01", to: "2026-10" };
    expect(analyticsKeys.overview(query)).toEqual(["analytics", "overview", query]);
    expect(analyticsKeys.overview(query).slice(0, 2)).toEqual(analyticsKeys.overviews());
    expect(analyticsKeys.overviews().slice(0, 1)).toEqual(analyticsKeys.all);
    expect(queryKeys.analytics).toBe(analyticsKeys);
  });

  it("are reused by the shared query options", () => {
    const query = { from: "2026-01", to: "2026-10" };
    expect(analyticsQueries.overview(query).queryKey).toEqual(analyticsKeys.overview(query));
  });
});

describe("analyticsQueries", () => {
  it("reads the overview through the same-origin route handler", async () => {
    const urls = captureFetch({});
    const query = { from: "2026-01", to: "2026-10" };
    await analyticsQueries.overview(query).queryFn?.(context(analyticsKeys.overview(query)));
    expect(urls).toEqual(["/api/analytics/overview?from=2026-01&to=2026-10"]);
  });

  it("omits undefined params from the URL", async () => {
    const urls = captureFetch({});
    await analyticsQueries.overview({}).queryFn?.(context(analyticsKeys.overview({})));
    expect(urls).toEqual(["/api/analytics/overview"]);
  });
});
