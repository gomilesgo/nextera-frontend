import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { makeQueryClient } from "./client";

function failingQuery(error: Error) {
  return vi.fn(async () => {
    throw error;
  });
}

describe("makeQueryClient", () => {
  it("never retries 4xx reads", async () => {
    const client = makeQueryClient();
    for (const status of [400, 401, 403, 404, 429]) {
      const queryFn = failingQuery(new ApiError(status, "x", "nope"));
      await expect(client.fetchQuery({ queryKey: ["t", status], queryFn, retryDelay: 0 })).rejects.toThrow("nope");
      expect(queryFn).toHaveBeenCalledTimes(1);
    }
  });

  it("retries server and network failures a bounded number of times", async () => {
    const client = makeQueryClient();
    const queryFn = failingQuery(new ApiError(503, "unavailable", "down"));
    await expect(client.fetchQuery({ queryKey: ["t", "503"], queryFn, retryDelay: 0 })).rejects.toThrow("down");
    expect(queryFn).toHaveBeenCalledTimes(3);
  });

  it("never retries on the server so a hung backend cannot stall a render", async () => {
    const client = makeQueryClient({ server: true });
    const queryFn = failingQuery(new ApiError(503, "unavailable", "down"));
    await expect(client.fetchQuery({ queryKey: ["s", "503"], queryFn })).rejects.toThrow("down");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("does not retry mutations", async () => {
    const client = makeQueryClient();
    const mutationFn = failingQuery(new ApiError(503, "unavailable", "down"));
    const mutation = client.getMutationCache().build(client, { mutationFn });
    await expect(mutation.execute(undefined)).rejects.toThrow("down");
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it("reports a lost session or blocked account once per failure", async () => {
    const onAuthLost = vi.fn();
    const client = makeQueryClient({ onAuthLost });
    await client.fetchQuery({ queryKey: ["a"], queryFn: failingQuery(new ApiError(401, "unauthorized", "x")) }).catch(() => {});
    await client
      .fetchQuery({ queryKey: ["b"], queryFn: failingQuery(new ApiError(403, "account_blocked", "x")) })
      .catch(() => {});
    await client.fetchQuery({ queryKey: ["c"], queryFn: failingQuery(new ApiError(403, "forbidden", "x")) }).catch(() => {});
    expect(onAuthLost.mock.calls.map(([, reason]) => reason)).toEqual(["session", "blocked"]);
    expect(onAuthLost.mock.calls[0]?.[0]).toBe(client);
  });
});
