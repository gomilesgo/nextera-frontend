import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { lead, leadId, ticketDetail, ticketId } from "@/test/desk";
import { LEADS_PAGE_SIZE, leadKeys, leadListSearch, leadQueries } from "./leads";
import { TICKETS_PAGE_SIZE, attachmentUrl, supportKeys, supportQueries, ticketListSearch } from "./support";

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

describe("lead keys", () => {
  it("nest lists and details under the leads root", () => {
    const params = { status: "new" as const, assigneeId: "none" };
    expect(leadKeys.list(params)).toEqual(["leads", "list", params]);
    expect(leadKeys.detail(leadId)).toEqual(["leads", "detail", leadId]);
    expect(leadKeys.list(params).slice(0, 2)).toEqual(leadKeys.lists());
    expect(leadKeys.detail(leadId).slice(0, 1)).toEqual(leadKeys.all);
    expect(leadQueries.list(params).queryKey).toEqual(leadKeys.list(params));
    expect(leadQueries.detail(leadId).queryKey).toEqual(leadKeys.detail(leadId));
  });

  it("build the page search with the cursor and page size", () => {
    expect(leadListSearch({ q: "Ravi K", from: "2026-10-01" }, null)).toBe(`q=Ravi+K&from=2026-10-01&limit=${LEADS_PAGE_SIZE}`);
    expect(leadListSearch({}, "abc_1")).toBe(`cursor=abc_1&limit=${LEADS_PAGE_SIZE}`);
  });

  it("page through the same-origin route handler", async () => {
    const urls = captureFetch({ items: [lead], nextCursor: "next_1" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const options = leadQueries.list({ status: "contacted" });

    const first = await client.fetchInfiniteQuery(options);
    expect(options.getNextPageParam(first.pages[0]!, first.pages, null, [null])).toBe("next_1");
    await options.queryFn?.({ pageParam: "next_1", queryKey: options.queryKey, signal: new AbortController().signal } as never);
    expect(urls[0]).toBe(`/api/leads?status=contacted&limit=${LEADS_PAGE_SIZE}`);
    expect(urls).toContain(`/api/leads?status=contacted&cursor=next_1&limit=${LEADS_PAGE_SIZE}`);

    await client.fetchQuery(leadQueries.detail(leadId));
    expect(urls.at(-1)).toBe(`/api/leads/${leadId}`);
  });

  it("stop paging when the backend returns no cursor", () => {
    const options = leadQueries.list({});
    expect(options.getNextPageParam({ items: [], nextCursor: null }, [], null, [null])).toBeNull();
    expect(options.initialPageParam).toBeNull();
  });
});

describe("support keys", () => {
  it("nest lists and details under the support root", () => {
    const params = { status: "open" as const, priority: "urgent" as const };
    expect(supportKeys.list(params)).toEqual(["support", "list", params]);
    expect(supportKeys.detail(ticketId)).toEqual(["support", "detail", ticketId]);
    expect(supportKeys.list(params).slice(0, 2)).toEqual(supportKeys.lists());
    expect(supportQueries.list(params).queryKey).toEqual(supportKeys.list(params));
    expect(supportQueries.detail(ticketId).queryKey).toEqual(supportKeys.detail(ticketId));
  });

  it("read through the same-origin route handlers", async () => {
    const urls = captureFetch(ticketDetail);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery(supportQueries.detail(ticketId));
    expect(urls).toEqual([`/api/support/tickets/${ticketId}`]);
    expect(ticketListSearch({ status: "open", assigneeId: "none" }, "c_2")).toBe(
      `status=open&assigneeId=none&cursor=c_2&limit=${TICKETS_PAGE_SIZE}`,
    );
    expect(attachmentUrl(ticketId, "m 1")).toBe(`/api/support/tickets/${ticketId}/messages/m%201/attachment`);
  });
});
