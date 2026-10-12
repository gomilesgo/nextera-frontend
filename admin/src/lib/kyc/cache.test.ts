import { describe, expect, it } from "vitest";
import { makeQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import { syncKycDecision } from "./cache";

const id = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";
const other = "0b8f7c55-1d7e-4a8a-8f3e-2c1c4a6f9e01";

describe("syncKycDecision", () => {
  it("invalidates queues, the reviewed customer and bank queues but not unrelated data", async () => {
    const client = makeQueryClient();
    const keys = [
      queryKeys.kyc.queue({ status: "submitted", limit: 50 }),
      queryKeys.kyc.queue({ status: "verified", limit: 100 }),
      queryKeys.kyc.customer(id),
      queryKeys.kyc.customer(other),
      queryKeys.customers.detail(id),
      queryKeys.bank.queue({ status: "review", limit: 50 }),
    ];
    for (const key of keys) client.setQueryData(key, {});
    client.setQueryData(queryKeys.customers.detail(other), {});
    client.setQueryData(queryKeys.session.me(), { staff: null });
    client.setQueryData(queryKeys.staff.list(), { staff: [] });

    await syncKycDecision(client, id);

    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated, key.join("/")).toBe(true);
    expect(client.getQueryState(queryKeys.customers.detail(other))?.isInvalidated).toBe(false);
    expect(client.getQueryState(queryKeys.session.me())?.isInvalidated).toBe(false);
    expect(client.getQueryState(queryKeys.staff.list())?.isInvalidated).toBe(false);
  });
});
