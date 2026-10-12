import { beforeEach, describe, expect, it, vi } from "vitest";
import { TICKET_ATTACHMENT_MAX_BYTES } from "@nextera/contracts";
import { ATTACHMENT_SIZE_ERROR } from "@/lib/support/attachment";
import { assigneeId, customerMessage, pdfBytes, pngBytes, ticket, ticketId } from "@/test/desk";
import { anonymous, callBackend, expired, fail, ok, redirectTarget, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { closeTicket, replyToTicket, updateTicket } = await import("./actions");

const staffMessage = { ...customerMessage, authorType: "staff" as const, attachment: null, body: "Checking now" };
const replied = { ticket: { ...ticket, status: "pending_customer" as const }, message: staffMessage };

function reply(values: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

function sentForm(): FormData | undefined {
  return writes()[0]?.[1]?.form;
}

beforeEach(resetStaffMocks);

describe("replyToTicket", () => {
  it("sends a text reply as JSON with the default status left to the backend", async () => {
    signedInAs("support", () => ok(replied, 201));

    await expect(replyToTicket(ticketId, reply({ body: "  Checking now  ", internal: "false" }))).resolves.toEqual({
      status: "ok",
      data: replied,
    });
    expect(writes()).toEqual([
      [
        `/v1/admin/support/tickets/${ticketId}/messages`,
        { method: "POST", token: "token-1", json: { body: "Checking now", internal: false } },
      ],
    ]);
  });

  it("sends an internal note with a chosen status", async () => {
    signedInAs("ops", () => ok(replied, 201));

    await replyToTicket(ticketId, reply({ body: "Escalated to finance", internal: "true", status: "open", attachment: new File([], "") }));
    expect(writes()[0]?.[1]?.json).toEqual({ body: "Escalated to finance", internal: true, status: "open" });
  });

  it("forwards an attachment as multipart with the backend's field names", async () => {
    signedInAs("support", () => ok(replied, 201));

    const file = new File([pdfBytes], "../Receipt (1).pdf", { type: "application/pdf" });
    await expect(
      replyToTicket(ticketId, reply({ body: "See attached", internal: "false", status: "resolved", attachment: file })),
    ).resolves.toMatchObject({ status: "ok" });

    const [path, init] = writes()[0] ?? [];
    expect(path).toBe(`/v1/admin/support/tickets/${ticketId}/messages`);
    expect(init?.json).toBeUndefined();
    const form = sentForm();
    expect(form).toBeInstanceOf(FormData);
    expect([...(form?.keys() ?? [])]).toEqual(["body", "internal", "status", "attachment"]);
    expect(form?.get("body")).toBe("See attached");
    expect(form?.get("internal")).toBe("false");
    expect(form?.get("status")).toBe("resolved");
    const sent = form?.get("attachment") as File;
    expect(sent.name).toBe("Receipt _1_.pdf");
    expect(sent.type).toBe("application/pdf");
    expect(new Uint8Array(await sent.arrayBuffer())).toEqual(pdfBytes);
  });

  it("enforces attachment type and size limits before calling the backend", async () => {
    signedInAs("owner");

    const cases: Array<[File, string]> = [
      [new File([new Uint8Array(TICKET_ATTACHMENT_MAX_BYTES + 1)], "big.pdf", { type: "application/pdf" }), ATTACHMENT_SIZE_ERROR],
      [new File(["<script>"], "page.html", { type: "text/html" }), "PDF, JPEG, PNG or WebP"],
      [new File(["<script>"], "fake.pdf", { type: "application/pdf" }), "PDF, JPEG, PNG or WebP"],
      [new File([pngBytes], "photo.pdf", { type: "application/pdf" }), "PDF, JPEG, PNG or WebP"],
      [new File([], "empty.pdf", { type: "application/pdf" }), "empty"],
    ];
    for (const [file, message] of cases) {
      const result = await replyToTicket(ticketId, reply({ body: "See attached", internal: "false", attachment: file }));
      expect(result).toMatchObject({ status: "error", code: "validation", errors: { attachment: [expect.stringContaining(message)] } });
    }
    expect(writes()).toEqual([]);
  });

  it("validates the body, internal flag and status", async () => {
    signedInAs("owner");

    await expect(replyToTicket(ticketId, reply({ body: "   " }))).resolves.toMatchObject({ errors: { body: [expect.any(String)] } });
    await expect(replyToTicket(ticketId, reply({ body: "x".repeat(5001) }))).resolves.toMatchObject({ status: "error" });
    await expect(replyToTicket(ticketId, reply({ body: "Hi", internal: "yes" }))).resolves.toMatchObject({
      errors: { internal: [expect.any(String)] },
    });
    await expect(replyToTicket(ticketId, reply({ body: "Hi", status: "closed" }))).resolves.toMatchObject({
      errors: { status: [expect.any(String)] },
    });
    await expect(replyToTicket("not-a-ticket", reply({ body: "Hi" }))).resolves.toMatchObject({ code: "not_found" });
    expect(writes()).toEqual([]);
  });

  it("requires internal to be exactly true or false (fail closed)", async () => {
    signedInAs("owner");

    await expect(replyToTicket(ticketId, reply({ body: "Hi" }))).resolves.toMatchObject({
      status: "error",
      code: "validation",
      errors: { internal: [expect.any(String)] },
    });
    expect(writes()).toEqual([]);
  });

  it("surfaces backend refusals", async () => {
    signedInAs("support", () => fail("conflict", "This ticket is closed. Reopen it before replying.", 409));
    await expect(replyToTicket(ticketId, reply({ body: "Hi", internal: "false" }))).resolves.toEqual({
      status: "error",
      code: "conflict",
      message: "This ticket is closed. Reopen it before replying.",
    });

    signedInAs("support", () => fail("validation", "Invalid", 400, { attachment: ["Attach a PDF, JPEG, PNG or WebP file"] }));
    await expect(replyToTicket(ticketId, reply({ body: "Hi", internal: "false" }))).resolves.toMatchObject({
      errors: { attachment: ["Attach a PDF, JPEG, PNG or WebP file"] },
    });
  });
});

describe("updateTicket and closeTicket", () => {
  it("patch status, priority and assignee for any staff role", async () => {
    signedInAs("support", () => ok({ ticket: { ...ticket, priority: "urgent" } }));

    await expect(updateTicket(ticketId, { priority: "urgent" })).resolves.toMatchObject({ status: "ok", data: { priority: "urgent" } });
    await updateTicket(ticketId, { assigneeId });
    await updateTicket(ticketId, { assigneeId: null, status: "open" });
    expect(writes().map(([path, init]) => [path, init?.method, init?.json])).toEqual([
      [`/v1/admin/support/tickets/${ticketId}`, "PATCH", { priority: "urgent" }],
      [`/v1/admin/support/tickets/${ticketId}`, "PATCH", { assigneeId }],
      [`/v1/admin/support/tickets/${ticketId}`, "PATCH", { assigneeId: null, status: "open" }],
    ]);
  });

  it("reject bad values and smuggled fields before calling the backend", async () => {
    signedInAs("owner");

    await expect(updateTicket(ticketId, { priority: "p0" })).resolves.toMatchObject({ code: "validation" });
    await expect(updateTicket(ticketId, { assigneeId: "me" })).resolves.toMatchObject({ code: "validation" });
    await expect(updateTicket(ticketId, {})).resolves.toMatchObject({ code: "validation" });
    await expect(updateTicket(ticketId, { customerId: "x" } as never)).resolves.toMatchObject({ code: "validation" });
    await expect(closeTicket("x")).resolves.toMatchObject({ code: "not_found" });
    expect(writes()).toEqual([]);
  });

  it("close a ticket and pass the already-closed conflict through", async () => {
    signedInAs("ops", () => ok({ ticket: { ...ticket, status: "closed", closedAt: "2026-10-12T05:00:00.000Z" } }));
    await expect(closeTicket(ticketId)).resolves.toMatchObject({ status: "ok", data: { status: "closed" } });
    expect(writes()).toEqual([[`/v1/admin/support/tickets/${ticketId}/close`, { method: "POST", token: "token-1" }]]);

    signedInAs("ops", () => fail("conflict", "This ticket is already closed", 409));
    await expect(closeTicket(ticketId)).resolves.toMatchObject({ code: "conflict", message: "This ticket is already closed" });
  });
});

describe("support action sessions", () => {
  it("redirects anonymous, expired and pending-password sessions without writing", async () => {
    anonymous();
    expect(await redirectTarget(replyToTicket(ticketId, reply({ body: "Hi" })))).toBe("/login");
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    expect(await redirectTarget(closeTicket(ticketId))).toBe("/login?expired=1");

    signedInAs("support", undefined, { mustChangePassword: true });
    expect(await redirectTarget(updateTicket(ticketId, { status: "resolved" }))).toBe("/account/password");
    expect(writes()).toEqual([]);
  });
});
