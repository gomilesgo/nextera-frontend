import { describe, expect, it } from "vitest";
import { CHOOSE_RESOLUTION, activationAvailability, parseResolution } from "./resolve";
import { ledgerTransactionId, payment } from "@/test/investments";

const note = "Refunded after confirming with the customer";

describe("parseResolution", () => {
  it("requires a Cashfree refund id for refunds", () => {
    expect(parseResolution({ resolution: "refunded", refundId: " rf_123 ", note })).toEqual({
      ok: true,
      data: { resolution: "refunded", refundId: "rf_123", note },
    });
    expect(parseResolution({ resolution: "refunded", refundId: "", note })).toEqual({
      ok: false,
      errors: { refundId: ["Enter the Cashfree refund id"] },
    });
  });

  it("requires a ledger transaction uuid for manual postings", () => {
    expect(parseResolution({ resolution: "posted_manually", ledgerTransactionId: ledgerTransactionId.toUpperCase(), note })).toEqual({
      ok: true,
      data: { resolution: "posted_manually", ledgerTransactionId, note },
    });
    expect(parseResolution({ resolution: "posted_manually", ledgerTransactionId: "txn-1", note })).toEqual({
      ok: false,
      errors: { ledgerTransactionId: ["Enter the ledger transaction id"] },
    });
  });

  it("accepts activated with only a note", () => {
    expect(parseResolution({ resolution: "activated", note: "  Webhook retry activated it  " })).toEqual({
      ok: true,
      data: { resolution: "activated", note: "Webhook retry activated it" },
    });
  });

  it("drops references that do not belong to the chosen resolution", () => {
    const parsed = parseResolution({ resolution: "activated", refundId: "rf_1", ledgerTransactionId, note, extra: true });
    expect(parsed).toEqual({ ok: true, data: { resolution: "activated", note } });
    const refund = parseResolution({ resolution: "refunded", refundId: "rf_1", ledgerTransactionId, note });
    expect(refund).toEqual({ ok: true, data: { resolution: "refunded", refundId: "rf_1", note } });
  });

  it("requires a note of 3 to 1000 characters for every resolution", () => {
    for (const resolution of ["refunded", "posted_manually", "activated"]) {
      const short = parseResolution({ resolution, refundId: "rf_1", ledgerTransactionId, note: " ok " });
      expect(short).toEqual({ ok: false, errors: { note: ["Explain how this was resolved"] } });
      const long = parseResolution({ resolution, refundId: "rf_1", ledgerTransactionId, note: "n".repeat(1001) });
      expect(long.ok).toBe(false);
    }
  });

  it("requires a resolution type and still reports the note", () => {
    expect(parseResolution({ resolution: "", note: "" })).toEqual({
      ok: false,
      errors: { resolution: [CHOOSE_RESOLUTION], note: ["Explain how this was resolved"] },
    });
    expect(parseResolution({ resolution: "deleted", note })).toEqual({ ok: false, errors: { resolution: [CHOOSE_RESOLUTION] } });
    expect(parseResolution(null)).toMatchObject({ ok: false, errors: { resolution: [CHOOSE_RESOLUTION] } });
  });

  it("ignores non-string inputs", () => {
    expect(parseResolution({ resolution: "refunded", refundId: 12345, note })).toEqual({
      ok: false,
      errors: { refundId: ["Enter the Cashfree refund id"] },
    });
  });
});

describe("activationAvailability", () => {
  it("offers activated only when the flag's payment went on to be paid", () => {
    expect(activationAvailability(payment)).toBe("available");
    expect(activationAvailability({ ...payment, status: "flagged" })).toBe("unavailable");
    expect(activationAvailability(null)).toBe("unknown");
  });
});
