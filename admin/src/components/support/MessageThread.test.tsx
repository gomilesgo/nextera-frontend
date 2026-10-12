import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { customerMessage, ticketId } from "@/test/desk";
import { MessageThread } from "./MessageThread";

const staffReply = {
  ...customerMessage,
  id: "7e3f4a6b-7c8d-4e9f-8a1b-2c3d4e5f6a11",
  authorType: "staff" as const,
  authorName: "Asha",
  body: "We are checking.",
  attachment: null,
};
const note = { ...staffReply, id: "8e3f4a6b-7c8d-4e9f-8a1b-2c3d4e5f6a22", internal: true, body: "Refund pending <img src=x onerror=alert(1)>" };

describe("MessageThread", () => {
  const html = renderToStaticMarkup(<MessageThread ticketId={ticketId} messages={[customerMessage, staffReply, note]} />);

  it("renders bodies as escaped plain text with line breaks preserved", () => {
    expect(html).toContain("I paid yesterday.\n&lt;b&gt;Not bold&lt;/b&gt;");
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("labels customer messages, staff replies and internal notes differently", () => {
    expect(html).toContain('aria-label="Customer from Ravi Kumar"');
    expect(html).toContain('aria-label="Reply from Asha"');
    expect(html).toContain('aria-label="Internal note from Asha"');
    expect(html).toContain("Not visible to the customer");
    expect(html).toContain("border-dashed");
  });

  it("links attachments to the authenticated download route", () => {
    expect(html).toContain(`href="/api/support/tickets/${ticketId}/messages/${customerMessage.id}/attachment"`);
    expect(html).toContain('download="receipt.pdf"');
    expect(html).toContain("2 KB");
  });
});
