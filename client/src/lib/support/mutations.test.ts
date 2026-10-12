import { beforeEach, describe, expect, it, vi } from "vitest";
import { TICKET_ATTACHMENT_MAX_BYTES } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { GENERIC_MESSAGES } from "@/lib/safeErrors";
import { MESSAGE_ID, PDF_BYTES, TICKET_ID, file, message, summary } from "./fixtures.test-utils";
import { SUPPORT_MESSAGES } from "./errors";
import { closeTicket, createTicket, replyToTicket } from "./mutations";
import type { MutationDeps } from "./mutations";
import { ATTACHMENT_MESSAGES } from "./validation";

vi.spyOn(console, "error").mockImplementation(() => {});

type Call = { path: string; init: Record<string, unknown> | undefined };

function setup(results: Array<BackendResult<unknown>>, token: string | null = "tok") {
  const calls: Call[] = [];
  const queue = [...results];
  const call = vi.fn(async (path: string, init?: Record<string, unknown>) => {
    calls.push({ path, init });
    return queue.shift() ?? { ok: true as const, status: 200, data: {} };
  });
  const clearSession = vi.fn(async () => {});
  const deps: MutationDeps = { token, call: call as unknown as MutationDeps["call"], clearSession };
  return { deps, calls, call, clearSession };
}

function form(values: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const ticketFields = { subject: "Payout not received", category: "withdrawal", body: "It has been a week." };
const created: BackendResult<unknown> = { ok: true, status: 201, data: { ticket: summary, messages: [message] } };
const replied: BackendResult<unknown> = {
  ok: true,
  status: 201,
  data: { ticket: summary, message: { ...message, attachment: null } },
};

describe("createTicket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends JSON when there is no attachment", async () => {
    const { deps, calls } = setup([created]);

    const result = await createTicket(deps, form({ ...ticketFields, attachment: new File([], "") }));

    expect(result).toEqual({ ok: true, data: { ticket: summary, messages: [message] } });
    expect(calls).toEqual([{ path: "/v1/support/tickets", init: { method: "POST", token: "tok", json: ticketFields } }]);
  });

  it("forwards the attachment as multipart with the backend field names", async () => {
    const { deps, calls } = setup([created]);
    const attachment = file(PDF_BYTES, "statement.pdf", "application/pdf");

    await createTicket(deps, form({ ...ticketFields, subject: " Payout not received ", attachment, extra: "ignored" }));

    const init = calls[0]?.init;
    expect(init?.json).toBeUndefined();
    const sent = init?.form as FormData;
    expect(sent).toBeInstanceOf(FormData);
    expect([...sent.keys()].sort()).toEqual(["attachment", "body", "category", "subject"]);
    expect(sent.get("subject")).toBe("Payout not received");
    const forwarded = sent.get("attachment") as File;
    expect(forwarded.name).toBe("statement.pdf");
    expect(forwarded.size).toBe(PDF_BYTES.byteLength);
    expect(new Uint8Array(await forwarded.arrayBuffer())).toEqual(PDF_BYTES);
  });

  it("enforces field and attachment limits before calling the backend", async () => {
    const { deps, call } = setup([created]);

    const invalid = await createTicket(deps, form({ subject: "", category: "", body: "" }));
    const tooLarge = await createTicket(
      deps,
      form({ ...ticketFields, attachment: file(TICKET_ATTACHMENT_MAX_BYTES + 1, "big.pdf", "application/pdf") }),
    );
    const disguised = await createTicket(
      deps,
      form({ ...ticketFields, attachment: file(new TextEncoder().encode("<html>"), "x.pdf", "application/pdf") }),
    );

    expect(invalid).toMatchObject({ ok: false, status: 400, code: "validation", message: SUPPORT_MESSAGES.invalid });
    expect(invalid.ok ? null : Object.keys(invalid.fields ?? {}).sort()).toEqual(["body", "category", "subject"]);
    expect(tooLarge).toMatchObject({ ok: false, fields: { attachment: [ATTACHMENT_MESSAGES.tooLarge] } });
    expect(disguised).toMatchObject({ ok: false, fields: { attachment: [ATTACHMENT_MESSAGES.type] } });
    expect(call).not.toHaveBeenCalled();
  });

  it("refuses without a session and never calls the backend", async () => {
    const { deps, call } = setup([created], null);

    expect(await createTicket(deps, form(ticketFields))).toMatchObject({ ok: false, status: 401, code: "unauthorized" });
    expect(call).not.toHaveBeenCalled();
  });

  it("maps the daily ticket cap to a friendly message with the wait", async () => {
    const { deps } = setup([
      {
        ok: false,
        status: 429,
        error: {
          code: "rate_limited",
          message: "You have opened many tickets today. Reply on an existing ticket or try again later.",
          retryAfterSeconds: 7200,
        },
      },
    ]);

    const result = await createTicket(deps, form(ticketFields));

    expect(result).toEqual({
      ok: false,
      status: 429,
      code: "rate_limited",
      message:
        "You have opened many tickets today. Reply on an existing ticket or try again later. You can try again in about 2 hours.",
      retryAfterSeconds: 7200,
    });
  });

  it("clears the session on a backend 401 when the service key is fine", async () => {
    const { deps, clearSession, calls } = setup([
      { ok: false, status: 401, error: { code: "unauthorized", message: "expired" } },
      { ok: true, status: 200, data: { service: "portal" } },
    ]);

    const result = await createTicket(deps, form(ticketFields));

    expect(result).toMatchObject({ ok: false, status: 401, code: "unauthorized" });
    expect(calls[1]?.path).toBe("/v1/ping");
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the backend rejects the service key", async () => {
    const { deps, clearSession } = setup([
      { ok: false, status: 401, error: { code: "unauthorized", message: "bad key" } },
      { ok: false, status: 401, error: { code: "unauthorized", message: "bad key" } },
    ]);

    const result = await createTicket(deps, form(ticketFields));

    expect(result).toMatchObject({ ok: false, status: 503, message: GENERIC_MESSAGES.misconfigured });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it("treats an unexpected success shape as a failure", async () => {
    const { deps } = setup([{ ok: true, status: 201, data: { ticket: { id: 1 } } }]);

    expect(await createTicket(deps, form(ticketFields))).toMatchObject({ ok: false, status: 502 });
  });
});

describe("replyToTicket", () => {
  it("rejects a non-uuid ticket id before anything else", async () => {
    const { deps, call } = setup([replied]);

    expect(await replyToTicket(deps, "../../admin", form({ body: "Hi" }))).toMatchObject({ ok: false, status: 404 });
    expect(call).not.toHaveBeenCalled();
  });

  it("posts the reply to the ticket's messages path", async () => {
    const { deps, calls } = setup([replied]);

    const result = await replyToTicket(deps, TICKET_ID, form({ body: " Thanks " }));

    expect(result.ok).toBe(true);
    expect(calls[0]).toEqual({
      path: `/v1/support/tickets/${TICKET_ID}/messages`,
      init: { method: "POST", token: "tok", json: { body: "Thanks" } },
    });
  });

  it("forwards a reply attachment as multipart", async () => {
    const { deps, calls } = setup([replied]);

    await replyToTicket(deps, TICKET_ID, form({ body: "Receipt attached", attachment: file(PDF_BYTES, "r.pdf", "") }));

    const sent = calls[0]?.init?.form as FormData;
    expect([...sent.keys()].sort()).toEqual(["attachment", "body"]);
  });

  it("explains closed tickets and per-ticket caps", async () => {
    const closed = setup([{ ok: false, status: 409, error: { code: "conflict", message: "closed" } }]);
    expect(await replyToTicket(closed.deps, TICKET_ID, form({ body: "Hi" }))).toMatchObject({
      status: 409,
      message: SUPPORT_MESSAGES.closedReply,
    });

    const capped = setup([
      {
        ok: false,
        status: 429,
        error: { code: "rate_limited", message: "This ticket has reached its message limit. Please open a new ticket." },
      },
    ]);
    expect(await replyToTicket(capped.deps, TICKET_ID, form({ body: "Hi" }))).toMatchObject({
      status: 429,
      message: "This ticket has reached its message limit. Please open a new ticket.",
    });
  });
});

describe("closeTicket", () => {
  it("validates the id and posts to the close path", async () => {
    const { deps, calls, call } = setup([{ ok: true, status: 200, data: { ticket: { ...summary, status: "closed" } } }]);

    expect(await closeTicket(deps, MESSAGE_ID.slice(0, 8))).toMatchObject({ ok: false, status: 404 });
    expect(call).not.toHaveBeenCalled();

    const result = await closeTicket(deps, TICKET_ID);

    expect(result).toEqual({ ok: true, data: { ticket: { ...summary, status: "closed" } } });
    expect(calls[0]).toEqual({ path: `/v1/support/tickets/${TICKET_ID}/close`, init: { method: "POST", token: "tok", json: {} } });
  });
});
