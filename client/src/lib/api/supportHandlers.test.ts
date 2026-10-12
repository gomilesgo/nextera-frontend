import { describe, expect, it, vi } from "vitest";
import type { BackendResult } from "@/lib/backend/client";
import { MESSAGE_ID, TICKET_ID, message, summary } from "@/lib/support/fixtures.test-utils";
import { clearSessionCookieHeader } from "./handlers";
import type { HandlerDeps } from "./handlers";
import {
  attachmentContentType,
  attachmentFileName,
  attachmentFileNames,
  contentDisposition,
  attachmentHandler,
  ticketHandler,
  ticketsHandler,
} from "./supportHandlers";

vi.spyOn(console, "error").mockImplementation(() => {});

function deps(results: Array<BackendResult<unknown>>, token: string | null = "tok") {
  const queue = [...results];
  const call = vi.fn(async () => queue.shift() ?? { ok: true as const, status: 200, data: {} });
  return { call, deps: { token, call: call as unknown as HandlerDeps["call"] } };
}

async function read(response: Response) {
  return { status: response.status, body: await response.json(), headers: response.headers };
}

const expired: BackendResult<unknown> = { ok: false, status: 401, error: { code: "unauthorized", message: "expired" } };
const pingOk: BackendResult<unknown> = { ok: true, status: 200, data: { service: "portal" } };

describe("ticketsHandler", () => {
  it("lists tickets with filters and no caching", async () => {
    const { call, deps: d } = deps([{ ok: true, status: 200, data: { items: [summary], nextCursor: "abc_1" } }]);

    const { status, body, headers } = await read(
      await ticketsHandler(d, new URLSearchParams({ status: "open", cursor: "abc-DEF_1" })),
    );

    expect(call).toHaveBeenCalledWith("/v1/support/tickets?status=open&cursor=abc-DEF_1&limit=20", { token: "tok" });
    expect(status).toBe(200);
    expect(body).toEqual({ items: [summary], nextCursor: "abc_1" });
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("rejects bad filters before calling the backend", async () => {
    const { call, deps: d } = deps([]);

    const { status, body } = await read(await ticketsHandler(d, new URLSearchParams({ status: "deleted", cursor: "a/b" })));

    expect(status).toBe(400);
    expect(Object.keys(body.error.fields).sort()).toEqual(["cursor", "status"]);
    expect(call).not.toHaveBeenCalled();
  });

  it("answers 401 and clears the cookie without a session", async () => {
    const { call, deps: d } = deps([], null);

    const { status, headers } = await read(await ticketsHandler(d, new URLSearchParams()));

    expect(status).toBe(401);
    expect(headers.get("set-cookie")).toBe(clearSessionCookieHeader());
    expect(headers.get("cache-control")).toBe("no-store");
    expect(call).not.toHaveBeenCalled();
  });

  it("clears the cookie when the backend says the session expired", async () => {
    const { deps: d } = deps([expired, pingOk]);

    const { status, headers } = await read(await ticketsHandler(d, new URLSearchParams()));

    expect(status).toBe(401);
    expect(headers.get("set-cookie")).toBe(clearSessionCookieHeader());
  });

  it("does not sign the customer out when the service key is rejected", async () => {
    const { deps: d } = deps([expired, expired]);

    const { status, headers } = await read(await ticketsHandler(d, new URLSearchParams()));

    expect(status).toBe(503);
    expect(headers.get("set-cookie")).toBeNull();
  });

  it("refuses unexpected shapes", async () => {
    const { deps: d } = deps([{ ok: true, status: 200, data: { items: [{ id: 1 }] } }]);

    expect((await ticketsHandler(d, new URLSearchParams())).status).toBe(502);
  });
});

describe("ticketHandler", () => {
  it("returns a validated ticket thread", async () => {
    const { call, deps: d } = deps([{ ok: true, status: 200, data: { ticket: summary, messages: [message] } }]);

    const { status, body, headers } = await read(await ticketHandler(d, TICKET_ID));

    expect(call).toHaveBeenCalledWith(`/v1/support/tickets/${TICKET_ID}`, { token: "tok" });
    expect(status).toBe(200);
    expect(body).toEqual({ ticket: summary, messages: [message] });
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("answers 404 for non-uuid ids without calling the backend", async () => {
    const { call, deps: d } = deps([]);

    for (const id of ["NXT-2610-0001", "..", `${TICKET_ID}/close`, ""]) {
      expect((await ticketHandler(d, id)).status).toBe(404);
    }
    expect(call).not.toHaveBeenCalled();
  });

  it("passes through the backend 404 for someone else's ticket", async () => {
    const { deps: d } = deps([{ ok: false, status: 404, error: { code: "not_found", message: "Ticket not found" } }]);

    const { status, body } = await read(await ticketHandler(d, TICKET_ID));

    expect(status).toBe(404);
    expect(body.error).toEqual({ code: "not_found", message: "Ticket not found" });
  });
});

describe("attachmentHandler", () => {
  function upstream(headers: Record<string, string>, bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { ok: true as const, status: 200, data: { bytes, headers: new Headers(headers) } };
  }

  it("streams the bytes with download-safe headers", async () => {
    const { call, deps: d } = deps([
      upstream({
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="statement.pdf"; filename*=UTF-8''statement.pdf`,
      }),
    ]);

    const response = await attachmentHandler(d, TICKET_ID, MESSAGE_ID);

    expect(call).toHaveBeenCalledWith(`/v1/support/tickets/${TICKET_ID}/messages/${MESSAGE_ID}/attachment`, {
      token: "tok",
      binary: true,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-length")).toBe("5");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="statement.pdf"; filename*=UTF-8''statement.pdf`,
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]));
  });

  it("sanitizes hostile file names and unexpected content types", async () => {
    const { deps: d } = deps([
      upstream({
        "content-type": "text/html",
        "content-disposition": `attachment; filename*=UTF-8''..%2F..%2Fevil%22%0D%0ASet-Cookie%3A%20x%3D1.html`,
      }),
    ]);

    const response = await attachmentHandler(d, TICKET_ID, MESSAGE_ID);
    const disposition = response.headers.get("content-disposition") ?? "";

    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(disposition.startsWith("attachment; ")).toBe(true);
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).toContain(`filename="evil___Set-Cookie_ x_1.html"`);
    expect(disposition).toContain(`filename*=UTF-8''evil%22Set-Cookie%3A%20x%3D1.html`);
  });

  it("keeps the NFC original name in filename* and an ASCII fallback in filename", async () => {
    const decomposed = "résumé (final).pdf";
    const { deps: d } = deps([
      upstream({
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(decomposed)}`,
      }),
    ]);

    const response = await attachmentHandler(d, TICKET_ID, MESSAGE_ID);

    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="resume _final_.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%28final%29.pdf`,
    );
    expect(contentDisposition("a.pdf")).toBe(`attachment; filename="a.pdf"; filename*=UTF-8''a.pdf`);
    expect(attachmentFileNames(`attachment; filename="C:\\Users\\asha\\scan.png"`, "image/png")).toEqual({
      ascii: "scan.png",
      original: "scan.png",
    });
  });

  it("falls back to a typed name", () => {
    expect(attachmentFileName(null, "image/png")).toBe("attachment.png");
    expect(attachmentFileName(`attachment; filename="..."`, "application/pdf")).toBe("attachment.pdf");
    expect(attachmentFileName(`attachment; filename="résumé.pdf"`, "application/pdf")).toBe("resume.pdf");
    expect(attachmentContentType("image/webp; charset=binary")).toBe("image/webp");
  });

  it("rejects non-uuid ids with 404 and no backend call", async () => {
    const { call, deps: d } = deps([]);

    expect((await attachmentHandler(d, TICKET_ID, "1")).status).toBe(404);
    expect((await attachmentHandler(d, "x", MESSAGE_ID)).status).toBe(404);
    expect(call).not.toHaveBeenCalled();
  });

  it("returns JSON errors, 404 for others' tickets and 401 with a cleared cookie", async () => {
    const missing = deps([{ ok: false, status: 404, error: { code: "not_found", message: "Ticket not found" } }]);
    const notFound = await read(await attachmentHandler(missing.deps, TICKET_ID, MESSAGE_ID));
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get("cache-control")).toBe("no-store");

    const lost = deps([expired, pingOk]);
    const signedOut = await attachmentHandler(lost.deps, TICKET_ID, MESSAGE_ID);
    expect(signedOut.status).toBe(401);
    expect(signedOut.headers.get("set-cookie")).toBe(clearSessionCookieHeader());

    const none = deps([], null);
    expect((await attachmentHandler(none.deps, TICKET_ID, MESSAGE_ID)).status).toBe(401);
    expect(none.call).not.toHaveBeenCalled();
  });
});
