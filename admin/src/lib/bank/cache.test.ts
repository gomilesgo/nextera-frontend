import { describe, expect, it } from "vitest";
import { makeQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import { formatScore, holdLabel, isAcceptedMatch, matchLabel } from "./labels";
import { syncBankDecision } from "./cache";

const id = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";
const other = "0b8f7c55-1d7e-4a8a-8f3e-2c1c4a6f9e01";

describe("syncBankDecision", () => {
  it("invalidates bank queues and the owning customer's KYC view only", async () => {
    const client = makeQueryClient();
    const touched = [
      queryKeys.bank.queue({ status: "review", limit: 50 }),
      queryKeys.bank.queue({ status: "verified", limit: 50 }),
      queryKeys.kyc.customer(id),
      queryKeys.customers.detail(id),
    ];
    const untouched = [
      queryKeys.kyc.customer(other),
      queryKeys.kyc.queue({ status: "submitted", limit: 50 }),
      queryKeys.session.me(),
    ];
    for (const key of [...touched, ...untouched]) client.setQueryData(key, {});

    await syncBankDecision(client, id);

    for (const key of touched) expect(client.getQueryState(key)?.isInvalidated, key.join("/")).toBe(true);
    for (const key of untouched) expect(client.getQueryState(key)?.isInvalidated, key.join("/")).toBe(false);
  });
});

describe("bank labels", () => {
  it("describes name match results and scores", () => {
    expect(matchLabel("POOR_PARTIAL_MATCH")).toBe("Poor partial match");
    expect(matchLabel(null)).toBe("Not reported");
    expect(matchLabel("NEW_CODE")).toBe("NEW_CODE");
    expect(isAcceptedMatch("GOOD_PARTIAL_MATCH")).toBe(true);
    expect(isAcceptedMatch("MODERATE_PARTIAL_MATCH")).toBe(false);
    expect(formatScore("48.00")).toBe("48 / 100");
    expect(formatScore(null)).toBe("—");
    expect(formatScore("n/a")).toBe("n/a");
    expect(holdLabel(null)).toBe("Weak name match");
    expect(holdLabel("kyc_rejected")).toBe("KYC was rejected");
  });
});
