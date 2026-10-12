import { describe, expect, it } from "vitest";
import { ActionError } from "@/lib/actions/outcome";
import { makeQueryClient } from "@/lib/queries/client";
import { investmentKeys } from "@/lib/queries/investments";
import { paymentKeys } from "@/lib/queries/payments";
import { flag, payment } from "@/test/investments";
import { refreshAfterFailedResolve } from "./cache";
import {
  RESOLUTION_MAY_HAVE_BEEN_RECORDED,
  RESOLVE_FAILED,
  resolutionOutcomeUnknown,
  resolveErrorCode,
  resolveErrorMessage,
  shouldRefreshFlag,
} from "./messages";

describe("resolve error messages", () => {
  it("warns that unavailable, internal and network failures may already be recorded", () => {
    expect(resolveErrorMessage(new ActionError("x", { code: "unavailable" }))).toBe(RESOLUTION_MAY_HAVE_BEEN_RECORDED);
    expect(resolveErrorMessage(new ActionError("x", { code: "internal" }))).toBe(RESOLUTION_MAY_HAVE_BEEN_RECORDED);
    expect(resolveErrorMessage(new TypeError("Failed to fetch"))).toBe(RESOLUTION_MAY_HAVE_BEEN_RECORDED);
    expect(resolveErrorCode(new TypeError("Failed to fetch"))).toBe("network");
    expect(resolutionOutcomeUnknown("network")).toBe(true);
    expect(resolutionOutcomeUnknown("conflict")).toBe(false);
  });

  it("shows known messages as they are", () => {
    expect(resolveErrorMessage(new ActionError("This flag is already resolved", { code: "conflict" }))).toBe(
      "This flag is already resolved",
    );
    expect(resolveErrorMessage(null)).toBeNull();
    expect(RESOLVE_FAILED).toMatch(/could not be resolved/);
  });

  it("refreshes the flag after a conflict or an unknown outcome only", () => {
    expect(shouldRefreshFlag("conflict")).toBe(true);
    expect(shouldRefreshFlag("internal")).toBe(true);
    expect(shouldRefreshFlag("network")).toBe(true);
    expect(shouldRefreshFlag("validation")).toBe(false);
    expect(shouldRefreshFlag(null)).toBe(false);
  });
});

describe("refreshAfterFailedResolve", () => {
  function seeded() {
    const client = makeQueryClient();
    client.setQueryData(paymentKeys.flag(flag.id), { flag, payment });
    client.setQueryData(paymentKeys.flagList({ state: "open", limit: 50 }), { flags: [flag] });
    client.setQueryData(paymentKeys.list({ limit: 50 }), { payments: [payment] });
    client.setQueryData(investmentKeys.detail(payment.investmentId), {});
    return client;
  }

  const invalidated = (client: ReturnType<typeof makeQueryClient>, key: readonly unknown[]) =>
    client.getQueryState(key)?.isInvalidated;

  it("invalidates the flag and flag lists when the outcome is unknown", async () => {
    const client = seeded();
    await refreshAfterFailedResolve(client, flag.id, new ActionError("x", { code: "unavailable" }));
    expect(invalidated(client, paymentKeys.flag(flag.id))).toBe(true);
    expect(invalidated(client, paymentKeys.flagList({ state: "open", limit: 50 }))).toBe(true);
    expect(invalidated(client, paymentKeys.list({ limit: 50 }))).toBe(false);
    expect(invalidated(client, investmentKeys.detail(payment.investmentId))).toBe(false);
  });

  it("leaves the cache alone for validation errors", async () => {
    const client = seeded();
    await refreshAfterFailedResolve(client, flag.id, new ActionError("x", { code: "validation" }));
    expect(invalidated(client, paymentKeys.flag(flag.id))).toBe(false);
  });
});
