import { describe, expect, it, vi } from "vitest";
import { makeQueryClient, makeServerQueryClient } from "./client";
import { ApiError, fetchJson } from "./fetchJson";
import { queryKeys } from "./keys";
import { bankQueries, kycQueries, planQueries, sessionQueries, settingsQueries, shouldRetry, staffQueries } from "./options";

describe("queryKeys", () => {
  it("nests every key under its domain root so invalidation cascades", () => {
    expect(queryKeys.session.me()).toEqual(["session", "me"]);
    expect(queryKeys.plans.list()).toEqual(["plans", "list"]);
    expect(queryKeys.plans.detail("p1")).toEqual(["plans", "detail", "p1"]);
    expect(queryKeys.plans.list().slice(0, 1)).toEqual(queryKeys.plans.all);
    expect(queryKeys.plans.detail("p1").slice(0, 1)).toEqual(queryKeys.plans.all);
  });

  it("is reused by the shared query options", () => {
    expect(sessionQueries.me().queryKey).toEqual(queryKeys.session.me());
    expect(planQueries.list().queryKey).toEqual(queryKeys.plans.list());
    expect(planQueries.detail("p1").queryKey).toEqual(queryKeys.plans.detail("p1"));
  });
});

describe("review and admin keys", () => {
  const id = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";

  it("nest under their domain so one invalidation reaches every page of a queue", () => {
    expect(queryKeys.kyc.queue({ status: "submitted", limit: 50 })).toEqual(["kyc", "queue", "submitted", 50]);
    expect(queryKeys.kyc.customer(id)).toEqual(["kyc", "customer", id]);
    expect(queryKeys.bank.queue({ status: "review", limit: 100 })).toEqual(["bank", "queue", "review", 100]);
    expect(queryKeys.customers.detail(id)).toEqual(["customers", "detail", id]);
    expect(queryKeys.staff.list()).toEqual(["staff", "list"]);
    expect(queryKeys.settings.current()).toEqual(["settings", "current"]);
    expect(queryKeys.kyc.queue({ status: "rejected", limit: 50 }).slice(0, 2)).toEqual(queryKeys.kyc.queues());
    expect(queryKeys.bank.queue({ status: "verified", limit: 50 }).slice(0, 2)).toEqual(queryKeys.bank.queues());
  });

  it("are reused by the shared query options", () => {
    const kycQuery = { status: "verified" as const, limit: 100 };
    const bankQuery = { status: "review" as const, limit: 50 };
    expect(kycQueries.queue(kycQuery).queryKey).toEqual(queryKeys.kyc.queue(kycQuery));
    expect(kycQueries.customer(id).queryKey).toEqual(queryKeys.kyc.customer(id));
    expect(bankQueries.queue(bankQuery).queryKey).toEqual(queryKeys.bank.queue(bankQuery));
    expect(staffQueries.list().queryKey).toEqual(queryKeys.staff.list());
    expect(settingsQueries.current().queryKey).toEqual(queryKeys.settings.current());
  });

  it("read through the same-origin route handlers", async () => {
    const urls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
      urls.push(String(input));
      return Response.json({});
    });
    try {
      const context = { signal: new AbortController().signal, meta: undefined, client: makeQueryClient() };
      await kycQueries.queue({ status: "rejected", limit: 100 }).queryFn?.({
        ...context,
        queryKey: queryKeys.kyc.queue({ status: "rejected", limit: 100 }),
      } as never);
      await kycQueries.customer(id).queryFn?.({ ...context, queryKey: queryKeys.kyc.customer(id) } as never);
      await bankQueries.queue({ status: "review", limit: 50 }).queryFn?.({
        ...context,
        queryKey: queryKeys.bank.queue({ status: "review", limit: 50 }),
      } as never);
      await staffQueries.list().queryFn?.({ ...context, queryKey: queryKeys.staff.list() } as never);
      await settingsQueries.current().queryFn?.({ ...context, queryKey: queryKeys.settings.current() } as never);
    } finally {
      globalThis.fetch = original;
    }
    expect(urls).toEqual([
      "/api/kyc?status=rejected&limit=100",
      `/api/kyc/${id}`,
      "/api/bank-accounts?status=review&limit=50",
      "/api/staff",
      "/api/settings",
    ]);
  });

  it("keep the previous page visible while a queue grows", () => {
    expect(kycQueries.queue({ status: "submitted", limit: 100 }).placeholderData).toBeTypeOf("function");
    expect(bankQueries.queue({ status: "review", limit: 100 }).placeholderData).toBeTypeOf("function");
  });
});

describe("shouldRetry", () => {
  it("never retries client errors", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(shouldRetry(0, new ApiError(status, { code: "x", message: "x" })), String(status)).toBe(false);
    }
  });

  it("retries server and network failures a bounded number of times", () => {
    const serverError = new ApiError(503, { code: "unavailable", message: "x" });
    expect(shouldRetry(0, serverError)).toBe(true);
    expect(shouldRetry(1, serverError)).toBe(true);
    expect(shouldRetry(2, serverError)).toBe(false);
    expect(shouldRetry(0, new ApiError(0, { code: "unavailable", message: "offline" }))).toBe(true);
    expect(shouldRetry(0, new TypeError("boom"))).toBe(true);
  });
});

describe("fetchJson", () => {
  it("requests same-origin JSON without caching", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ plans: [] }));
    await expect(fetchJson("/api/plans", fetcher)).resolves.toEqual({ plans: [] });
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.credentials).toBe("same-origin");
    expect(init?.cache).toBe("no-store");
  });

  it("throws the handler envelope as an ApiError", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ error: { code: "forbidden", message: "Nope" } }, { status: 403 }),
    );
    await expect(fetchJson("/api/plans", fetcher)).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      code: "forbidden",
      message: "Nope",
    });
  });

  it("maps non-envelope and network failures", async () => {
    const html = vi.fn<typeof fetch>(async () => new Response("<html>", { status: 502 }));
    await expect(fetchJson("/api/plans", html)).rejects.toMatchObject({ status: 502, code: "unavailable" });
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(fetchJson("/api/plans", offline)).rejects.toMatchObject({ status: 0, code: "unavailable" });
  });
});

describe("makeQueryClient", () => {
  it("uses the retry rule and clears state on 401", async () => {
    const onUnauthorized = vi.fn();
    const client = makeQueryClient({ onUnauthorized });
    expect(client.getDefaultOptions().queries?.retry).toBe(shouldRetry);
    client.setQueryData(queryKeys.plans.list(), { plans: [] });

    await client
      .fetchQuery({
        queryKey: queryKeys.session.me(),
        queryFn: () => Promise.reject(new ApiError(401, { code: "unauthorized", message: "Expired" })),
      })
      .catch(() => undefined);

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(client.getQueryData(queryKeys.plans.list())).toBeUndefined();
  });

  it("sends staff with a pending password change to the password page", async () => {
    const onUnauthorized = vi.fn();
    const onPasswordChangeRequired = vi.fn();
    const client = makeQueryClient({ onUnauthorized, onPasswordChangeRequired });
    client.setQueryData(queryKeys.session.me(), { staff: null });
    await client
      .fetchQuery({
        queryKey: queryKeys.plans.list(),
        queryFn: () =>
          Promise.reject(new ApiError(403, { code: "password_change_required", message: "Change it" })),
      })
      .catch(() => undefined);
    expect(onPasswordChangeRequired).toHaveBeenCalledOnce();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.session.me())).toEqual({ staff: null });
  });

  it("does not redirect on other errors", async () => {
    const onUnauthorized = vi.fn();
    const onPasswordChangeRequired = vi.fn();
    const client = makeQueryClient({ onUnauthorized, onPasswordChangeRequired });
    await client
      .fetchQuery({
        queryKey: queryKeys.plans.list(),
        queryFn: () => Promise.reject(new ApiError(403, { code: "forbidden", message: "No" })),
      })
      .catch(() => undefined);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onPasswordChangeRequired).not.toHaveBeenCalled();
  });
});

describe("makeServerQueryClient", () => {
  it("never retries so outages and redirects reach the page", async () => {
    const client = makeServerQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(false);
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    const queryFn = vi.fn(() => Promise.reject(redirectError));
    await expect(client.fetchQuery({ queryKey: queryKeys.plans.list(), queryFn })).rejects.toBe(redirectError);
    expect(queryFn).toHaveBeenCalledOnce();
  });
});
