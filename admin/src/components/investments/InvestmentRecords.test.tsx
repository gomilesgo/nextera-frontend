import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InvestmentDocuments, documentHref } from "./InvestmentDocuments";
import { PaymentEvents } from "./PaymentEvents";
import { documentId, flag, investmentDetail, investmentId } from "@/test/investments";

describe("PaymentEvents", () => {
  it("renders event details as escaped text, never as markup", () => {
    const hostile = { ...flag, flagDetail: '<img src=x onerror="alert(1)">', type: "<script>alert(1)</script>" };
    const html = renderToStaticMarkup(<PaymentEvents events={[hostile]} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x onerror=");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain(`href="/payment-flags/${flag.id}"`);
    expect(html).toContain("Amount mismatch");
  });

  it("explains when there are no events", () => {
    expect(renderToStaticMarkup(<PaymentEvents events={[]} />)).toContain("No gateway events");
  });
});

describe("InvestmentDocuments", () => {
  it("links each document to the authenticated PDF route in a new tab", () => {
    const html = renderToStaticMarkup(
      <InvestmentDocuments investmentId={investmentId} documents={investmentDetail.documents} bondExpected />,
    );
    expect(documentHref(investmentId, documentId)).toBe(`/api/investments/${investmentId}/documents/${documentId}`);
    expect(html).toContain(`href="/api/investments/${investmentId}/documents/${documentId}"`);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Bond certificate");
    expect(html).not.toContain("bond-documents job");
  });

  it("notes a missing bond certificate on an active investment", () => {
    const html = renderToStaticMarkup(<InvestmentDocuments investmentId={investmentId} documents={[]} bondExpected />);
    expect(html).toContain("bond-documents job");
  });
});
