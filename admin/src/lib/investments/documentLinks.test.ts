import { describe, expect, it } from "vitest";
import { guardRequest } from "@/lib/guard";
import { documentLoginPath, documentReturnPath } from "./documentLinks";
import { documentId, investmentId } from "@/test/investments";

describe("document links", () => {
  it("returns to the investment page for a document download", () => {
    expect(documentReturnPath(`/api/investments/${investmentId.toUpperCase()}/documents/${documentId}`)).toBe(
      `/investments/${investmentId}`,
    );
    expect(documentReturnPath(`/api/investments/abc/documents/${documentId}`)).toBe("/investments");
    expect(documentReturnPath(`/api/investments/${investmentId}`)).toBeNull();
    expect(documentReturnPath("/api/payments")).toBeNull();
  });

  it("builds a same-origin login path", () => {
    expect(documentLoginPath(`/investments/${investmentId}`, true)).toBe(
      `/login?expired=1&next=%2Finvestments%2F${investmentId}`,
    );
    expect(documentLoginPath("/investments", false)).toBe("/login?next=%2Finvestments");
  });

  it("lets the proxy send an anonymous PDF click to login instead of a JSON 401", () => {
    expect(
      guardRequest({ pathname: `/api/investments/${investmentId}/documents/${documentId}`, search: "", hasSession: false }),
    ).toEqual({ action: "redirect", location: `/login?next=%2Finvestments%2F${investmentId}` });
    expect(guardRequest({ pathname: `/api/investments/${investmentId}`, search: "", hasSession: false })).toEqual({
      action: "unauthorized",
    });
    expect(
      guardRequest({ pathname: `/api/investments/${investmentId}/documents/${documentId}`, search: "", hasSession: true }),
    ).toEqual({ action: "allow" });
  });
});
