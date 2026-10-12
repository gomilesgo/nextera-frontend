import { describe, expect, it } from "vitest";
import { csvDownloadHeaders, filenameFromDisposition, ledgerCsvFilename } from "./export";

const customerId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";

describe("ledgerCsvFilename", () => {
  it("names the file after the customer, account and IST date", () => {
    const lateUtc = new Date("2026-10-11T20:00:00.000Z");
    expect(ledgerCsvFilename(customerId, undefined, lateUtc)).toBe(`nextera-customer-${customerId}-ledger-2026-10-12.csv`);
    expect(ledgerCsvFilename(customerId, "principal:9a/../x", lateUtc)).toBe(
      `nextera-customer-${customerId}-ledger-principal-9a-x-2026-10-12.csv`,
    );
  });

  it("never lets header-breaking characters into the filename", () => {
    const name = ledgerCsvFilename(customerId, 'wallet"\r\nset-cookie: a=b', new Date("2026-10-12T00:00:00.000Z"));
    expect(name).toMatch(/^[a-z0-9.-]+$/);
  });
});

describe("csvDownloadHeaders", () => {
  it("forces a download that is never cached or sniffed", () => {
    expect(csvDownloadHeaders("a.csv")).toEqual({
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="a.csv"',
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
  });
});

describe("filenameFromDisposition", () => {
  it("reads safe filenames and falls back otherwise", () => {
    expect(filenameFromDisposition('attachment; filename="ledger-2026.csv"', "x.csv")).toBe("ledger-2026.csv");
    expect(filenameFromDisposition('attachment; filename="../evil.sh"', "x.csv")).toBe("x.csv");
    expect(filenameFromDisposition(null, "x.csv")).toBe("x.csv");
  });
});
