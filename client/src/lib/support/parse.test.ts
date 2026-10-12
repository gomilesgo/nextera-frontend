import { describe, expect, it } from "vitest";
import { message, summary } from "./fixtures.test-utils";
import { toTicketDetail, toTicketList, toTicketMessage, toTicketMessageResponse, toTicketResponse, toTicketSummary } from "./parse";

describe("toTicketSummary", () => {
  it("accepts the backend shape and drops unknown keys", () => {
    expect(toTicketSummary({ ...summary, customerId: "secret" })).toEqual(summary);
  });

  it("rejects unknown enums and bad timestamps", () => {
    expect(toTicketSummary({ ...summary, status: "deleted" })).toBeNull();
    expect(toTicketSummary({ ...summary, category: "loans" })).toBeNull();
    expect(toTicketSummary({ ...summary, lastMessageAt: "yesterday" })).toBeNull();
    expect(toTicketSummary({ ...summary, closedAt: undefined })).toBeNull();
    expect(toTicketSummary(null)).toBeNull();
  });
});

describe("toTicketMessage", () => {
  it("accepts messages with and without attachments", () => {
    expect(toTicketMessage(message)).toEqual(message);
    expect(toTicketMessage({ ...message, attachment: null })).toEqual({ ...message, attachment: null });
  });

  it("rejects malformed messages", () => {
    expect(toTicketMessage({ ...message, authorType: "system" })).toBeNull();
    expect(toTicketMessage({ ...message, attachment: { name: "a" } })).toBeNull();
    expect(toTicketMessage({ ...message, body: 1 })).toBeNull();
  });
});

describe("response parsers", () => {
  it("parse list, detail, ticket and message responses", () => {
    expect(toTicketList({ items: [summary], nextCursor: "abc" })).toEqual({ items: [summary], nextCursor: "abc" });
    expect(toTicketList({ items: [summary], nextCursor: null })).toEqual({ items: [summary], nextCursor: null });
    expect(toTicketList({ items: [{ ...summary, status: "x" }], nextCursor: null })).toBeNull();
    expect(toTicketList({ items: [], nextCursor: 5 })).toBeNull();
    expect(toTicketDetail({ ticket: summary, messages: [message] })).toEqual({ ticket: summary, messages: [message] });
    expect(toTicketDetail({ ticket: summary })).toBeNull();
    expect(toTicketResponse({ ticket: summary })).toEqual({ ticket: summary });
    expect(toTicketMessageResponse({ ticket: summary, message })).toEqual({ ticket: summary, message });
    expect(toTicketMessageResponse({ ticket: summary })).toBeNull();
  });
});
