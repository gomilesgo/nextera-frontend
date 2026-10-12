import { describe, expect, it } from "vitest";
import { TICKET_ATTACHMENT_MAX_BYTES } from "@nextera/contracts";
import { PDF_BYTES, PNG_BYTES, file } from "./fixtures.test-utils";
import {
  ATTACHMENT_MESSAGES,
  SUPPORT_ATTACHMENT_MAX_LABEL,
  attachmentFrom,
  checkAttachment,
  isTicketId,
  megabyteLabel,
  validateReplyForm,
  validateTicketForm,
  verifyAttachment,
  withVerifiedAttachment,
} from "./validation";

function form(values: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const validTicket = { subject: "Payout not received", category: "withdrawal", body: "It has been a week." };

describe("isTicketId", () => {
  it("accepts uuids only", () => {
    expect(isTicketId("8f14e45f-ceea-467f-a0e6-2b8c6c1b3a11")).toBe(true);
    expect(isTicketId("NXT-2610-0001")).toBe(false);
    expect(isTicketId("../etc/passwd")).toBe(false);
    expect(isTicketId("8f14e45f-ceea-467f-a0e6-2b8c6c1b3a11/close")).toBe(false);
    expect(isTicketId(undefined)).toBe(false);
  });
});

describe("attachmentFrom", () => {
  it("treats an untouched file input as no attachment", () => {
    expect(attachmentFrom(form({ attachment: new File([], "", { type: "application/octet-stream" }) }))).toBeNull();
    expect(attachmentFrom(form({ attachment: new File([], "blob") }))).toBeNull();
    expect(attachmentFrom(form({ attachment: "" }))).toBeNull();
    expect(attachmentFrom(new FormData())).toBeNull();
  });

  it("keeps a named empty file so it can be reported", () => {
    expect(attachmentFrom(form({ attachment: new File([], "scan.pdf") }))?.name).toBe("scan.pdf");
  });

  it("returns a chosen file", () => {
    const chosen = file(PDF_BYTES, "a.pdf", "application/pdf");
    expect(attachmentFrom(form({ attachment: chosen }))?.name).toBe("a.pdf");
  });
});

describe("checkAttachment", () => {
  it("enforces size and type", () => {
    expect(checkAttachment({ name: "a.pdf", size: 0, type: "application/pdf" })).toBe(ATTACHMENT_MESSAGES.empty);
    expect(checkAttachment({ name: "a.pdf", size: TICKET_ATTACHMENT_MAX_BYTES + 1, type: "application/pdf" })).toBe(
      ATTACHMENT_MESSAGES.tooLarge,
    );
    expect(checkAttachment({ name: "a.pdf", size: TICKET_ATTACHMENT_MAX_BYTES, type: "application/pdf" })).toBeNull();
    expect(checkAttachment({ name: "a.gif", size: 10, type: "image/gif" })).toBe(ATTACHMENT_MESSAGES.type);
    expect(checkAttachment({ name: "a.exe", size: 10, type: "" })).toBe(ATTACHMENT_MESSAGES.type);
    expect(checkAttachment({ name: "scan.JPG", size: 10, type: "" })).toBeNull();
  });

  it("uses the contracts limit, which fits under the Vercel request limit", () => {
    expect(TICKET_ATTACHMENT_MAX_BYTES).toBeLessThanOrEqual(4.5 * 1024 * 1024 - 64 * 1024);
    expect(SUPPORT_ATTACHMENT_MAX_LABEL).toBe(megabyteLabel(TICKET_ATTACHMENT_MAX_BYTES));
    expect(ATTACHMENT_MESSAGES.tooLarge).toBe(`Attach a file of at most ${SUPPORT_ATTACHMENT_MAX_LABEL}.`);
  });

  it("labels sizes in whole or tenth megabytes", () => {
    expect(megabyteLabel(4 * 1024 * 1024)).toBe("4 MB");
    expect(megabyteLabel(5 * 1024 * 1024)).toBe("5 MB");
    expect(megabyteLabel(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});

describe("verifyAttachment", () => {
  it("checks the leading bytes, not just the declared type", async () => {
    expect(await verifyAttachment(file(PDF_BYTES, "a.pdf", "application/pdf"))).toBeNull();
    expect(await verifyAttachment(file(PNG_BYTES, "a.png", ""))).toBeNull();
    expect(await verifyAttachment(file(new TextEncoder().encode("<script>"), "a.pdf", "application/pdf"))).toBe(
      ATTACHMENT_MESSAGES.type,
    );
    expect(await verifyAttachment(file(PNG_BYTES, "a.pdf", "application/pdf"))).toBe(ATTACHMENT_MESSAGES.type);
  });
});

describe("validateTicketForm", () => {
  it("returns the trimmed input and attachment", () => {
    const attachment = file(PDF_BYTES, "a.pdf", "application/pdf");
    const result = validateTicketForm(form({ ...validTicket, subject: "  Payout not received ", attachment }));
    expect(result).toEqual({ ok: true, input: validTicket, attachment });
  });

  it("reports each field", () => {
    const result = validateTicketForm(form({ subject: "Hi", category: "loans", body: "  " }));
    expect(result).toEqual({
      ok: false,
      errors: {
        subject: "Use at least 3 characters for the subject.",
        category: "Choose a topic.",
        body: "Write a message.",
      },
    });
    expect(validateTicketForm(form({ ...validTicket, subject: "" }))).toMatchObject({ errors: { subject: "Enter a subject." } });
    expect(validateTicketForm(form({ ...validTicket, subject: "x".repeat(161) }))).toMatchObject({ ok: false });
    expect(validateTicketForm(form({ ...validTicket, body: "x".repeat(5001) }))).toMatchObject({ ok: false });
  });

  it("reports attachment problems alongside field errors", () => {
    const result = validateTicketForm(form({ ...validTicket, attachment: file(10, "a.gif", "image/gif") }));
    expect(result).toEqual({ ok: false, errors: { attachment: ATTACHMENT_MESSAGES.type } });
  });
});

describe("validateReplyForm", () => {
  it("needs a message", () => {
    expect(validateReplyForm(form({ body: "" }))).toEqual({ ok: false, errors: { body: "Write a message." } });
    expect(validateReplyForm(form({ body: "Thanks" }))).toEqual({ ok: true, input: { body: "Thanks" }, attachment: null });
  });
});

describe("withVerifiedAttachment", () => {
  it("rejects a disguised file after the cheap checks pass", async () => {
    const disguised = file(new TextEncoder().encode("MZ......"), "a.png", "image/png");
    const result = await withVerifiedAttachment(validateReplyForm(form({ body: "See file", attachment: disguised })));
    expect(result).toEqual({ ok: false, errors: { attachment: ATTACHMENT_MESSAGES.type } });
  });
});
