import { describe, expect, it } from "vitest";
import { makeQueryClient } from "@/lib/queries/client";
import { investmentKeys } from "@/lib/queries/investments";
import { paymentKeys } from "@/lib/queries/payments";
import { queryKeys } from "@/lib/queries/keys";
import { flag, investmentId, payment } from "@/test/investments";
import { syncFlagResolution } from "./cache";

describe("syncFlagResolution", () => {
  it("stores the resolved flag and refreshes payment and investment views", async () => {
    const client = makeQueryClient();
    const resolved = { ...flag, resolvedAt: "2026-10-12T10:00:00.000Z", resolutionType: "refunded" as const };
    client.setQueryData(paymentKeys.flag(flag.id), { flag, payment });
    client.setQueryData(paymentKeys.flagList({ state: "open", limit: 50 }), { flags: [flag] });
    client.setQueryData(paymentKeys.list({ limit: 50 }), { payments: [payment] });
    client.setQueryData(paymentKeys.openFlagCount(), { flags: [flag] });
    client.setQueryData(investmentKeys.detail(investmentId), {});
    client.setQueryData(investmentKeys.list({}), { pages: [], pageParams: [] });
    client.setQueryData(queryKeys.plans.list(), { plans: [] });

    await syncFlagResolution(client, resolved);

    expect(client.getQueryData(paymentKeys.flag(flag.id))).toEqual({ flag: resolved, payment });
    const state = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    expect(state(paymentKeys.flag(flag.id))).toBe(true);
    expect(state(paymentKeys.flagList({ state: "open", limit: 50 }))).toBe(true);
    expect(state(paymentKeys.list({ limit: 50 }))).toBe(true);
    expect(state(paymentKeys.openFlagCount())).toBe(true);
    expect(state(investmentKeys.detail(investmentId))).toBe(true);
    expect(state(investmentKeys.list({}))).toBe(false);
    expect(state(queryKeys.plans.list())).toBe(false);
  });

  it("does not invent a detail entry that was never loaded", async () => {
    const client = makeQueryClient();
    await syncFlagResolution(client, flag);
    expect(client.getQueryData(paymentKeys.flag(flag.id))).toBeUndefined();
  });
});
