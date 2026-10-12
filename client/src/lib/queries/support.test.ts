import { afterEach, describe, expect, it, vi } from "vitest";
import { summary } from "@/lib/support/fixtures.test-utils";
import { queryKeys } from "./keys";
import { SUPPORT_STALE_MS, supportKeys, ticketQuery, ticketsQuery } from "./support";

afterEach(() => vi.unstubAllGlobals());

describe("supportKeys", () => {
  it("nests every support key under the app root and support.all", () => {
    const root = supportKeys.all();
    expect(root).toEqual([...queryKeys.all, "support"]);
    expect(supportKeys.list(null)).toEqual(["nextera", "support", "list", "all"]);
    expect(supportKeys.list("open")).toEqual(["nextera", "support", "list", "open"]);
    expect(supportKeys.detail("t1")).toEqual(["nextera", "support", "detail", "t1"]);
    for (const key of [supportKeys.lists(), supportKeys.list("closed"), supportKeys.detail("t1")]) {
      expect(key.slice(0, root.length)).toEqual(root);
    }
    expect(supportKeys.list("open").slice(0, supportKeys.lists().length)).toEqual(supportKeys.lists());
  });
});

describe("ticketsQuery", () => {
  it("pages by cursor and stops when there is none", () => {
    const options = ticketsQuery("open");
    expect(options.queryKey).toEqual(supportKeys.list("open"));
    expect(options.initialPageParam).toBeNull();
    expect(options.staleTime).toBe(SUPPORT_STALE_MS);
    expect(options.refetchOnWindowFocus).toBe(true);
    const next = options.getNextPageParam;
    expect(next({ items: [], nextCursor: "c2" }, [], null, [])).toBe("c2");
    expect(next({ items: [], nextCursor: null }, [], null, [])).toBeUndefined();
  });

  it("calls the same-origin handler with status and cursor by default", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ items: [summary], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);
    const options = ticketsQuery("pending_customer");

    const page = await (options.queryFn as (context: { pageParam: string | null; signal: AbortSignal }) => Promise<unknown>)({
      pageParam: "abc",
      signal: new AbortController().signal,
    });

    expect(page).toEqual({ items: [summary], nextCursor: null });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/support/tickets?status=pending_customer&cursor=abc&limit=20");
  });

  it("lets the server swap in a direct loader under the same key", async () => {
    const load = vi.fn(async () => ({ items: [], nextCursor: null }));
    const options = ticketsQuery(null, load);
    expect(options.queryKey).toEqual(supportKeys.list(null));
    await (options.queryFn as (context: { pageParam: string | null; signal?: AbortSignal }) => Promise<unknown>)({
      pageParam: null,
    });
    expect(load).toHaveBeenCalledWith(null, undefined);
  });
});

describe("ticketQuery", () => {
  it("uses the detail key and the encoded handler path", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ticket: summary, messages: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const options = ticketQuery(summary.id);

    expect(options.queryKey).toEqual(supportKeys.detail(summary.id));
    expect(options.refetchOnWindowFocus).toBe(true);
    await (options.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
      signal: new AbortController().signal,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/support/tickets/${summary.id}`);
  });
});
