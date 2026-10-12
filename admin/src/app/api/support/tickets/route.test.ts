import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { BackendDownload } from "@/lib/backend/download";
import { messageId, pdfBytes, ticket, ticketDetail, ticketId } from "@/test/desk";
import { anonymous, callBackend, expired, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

const downloadFromBackend = vi.hoisted(
  () => vi.fn<(path: string, init: { token: string; accept: string }) => Promise<BackendDownload>>(),
);

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);
vi.mock("@/lib/backend/download", () => ({ downloadFromBackend }));

const list = await import("./route");
const detail = await import("./[id]/route");
const download = await import("./[id]/messages/[messageId]/attachment/route");

function listRequest(search = "") {
  return list.GET(new NextRequest(`http://admin.test/api/support/tickets${search}`));
}

function detailRequest(id: string) {
  return detail.GET(new Request(`http://admin.test/api/support/tickets/${id}`), { params: Promise.resolve({ id }) });
}

function downloadRequest(id: string, message: string) {
  return download.GET(new Request(`http://admin.test/api/support/tickets/${id}/messages/${message}/attachment`), {
    params: Promise.resolve({ id, messageId: message }),
  });
}

function upstream(body: Uint8Array<ArrayBuffer>, headers: Record<string, string>): BackendDownload {
  return { ok: true, status: 200, body: new Response(body).body, headers: new Headers(headers) };
}

beforeEach(() => {
  resetStaffMocks();
  downloadFromBackend.mockReset();
});

describe("GET /api/support/tickets", () => {
  it("returns the queue without caching for every role", async () => {
    for (const role of ["owner", "ops", "support"] as const) {
      signedInAs(role, () => ok({ items: [ticket], nextCursor: null }));
      const response = await listRequest("?status=open");
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await readJson(response)).toEqual({ items: [ticket], nextCursor: null });
    }
  });

  it("forwards validated filters", async () => {
    signedInAs("support", () => ok({ items: [], nextCursor: null }));

    await listRequest(`?status=pending_customer&category=kyc&priority=urgent&assigneeId=none&q=NXT-2610&cursor=c1&limit=50`);
    expect(writes()).toEqual([
      [
        "/v1/admin/support/tickets?status=pending_customer&category=kyc&priority=urgent&assigneeId=none&q=NXT-2610&cursor=c1&limit=50",
        { token: "token-1" },
      ],
    ]);
  });

  it("rejects invalid filters before calling the backend", async () => {
    signedInAs("owner");

    for (const search of ["?status=waiting", "?category=loans", "?priority=p1", "?assigneeId=me", "?limit=0"]) {
      const response = await listRequest(search);
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(writes()).toEqual([]);
  });

  it("answers 401 without a session and 403 while a password change is pending", async () => {
    anonymous();
    expect((await listRequest()).status).toBe(401);
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    expect((await listRequest()).status).toBe(401);

    signedInAs("support", undefined, { mustChangePassword: true });
    expect((await listRequest()).status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it("refuses a malformed backend payload", async () => {
    signedInAs("ops", () => ok({ items: [{ ...ticket, status: "weird" }], nextCursor: null }));
    expect((await listRequest()).status).toBe(500);
  });
});

describe("GET /api/support/tickets/[id]", () => {
  it("returns the ticket with its thread", async () => {
    signedInAs("support", () => ok(ticketDetail));

    const response = await detailRequest(ticketId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual(ticketDetail);
    expect(writes()).toEqual([[`/v1/admin/support/tickets/${ticketId}`, { token: "token-1" }]]);
  });

  it("answers 404 for a non-uuid id without calling the backend", async () => {
    signedInAs("owner");
    expect((await detailRequest("1 or 1=1")).status).toBe(404);
    expect(writes()).toEqual([]);
  });
});

describe("GET /api/support/tickets/[id]/messages/[messageId]/attachment", () => {
  it("streams the bytes with safe download headers", async () => {
    signedInAs("support");
    downloadFromBackend.mockResolvedValue(
      upstream(pdfBytes, {
        "content-type": "application/pdf",
        "content-length": String(pdfBytes.byteLength),
        "content-disposition": `attachment; filename="receipt.pdf"; filename*=UTF-8''receipt.pdf`,
      }),
    );

    const response = await downloadRequest(ticketId, messageId);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-length")).toBe(String(pdfBytes.byteLength));
    expect(response.headers.get("content-disposition")).toBe(`attachment; filename="receipt.pdf"; filename*=UTF-8''receipt.pdf`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdfBytes);
    expect(downloadFromBackend).toHaveBeenCalledWith(
      `/v1/admin/support/tickets/${ticketId}/messages/${messageId}/attachment`,
      { token: "token-1", accept: "*/*" },
    );
  });

  it("sanitizes hostile file names and unknown content types", async () => {
    signedInAs("ops");
    downloadFromBackend.mockResolvedValue(
      upstream(pdfBytes, {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename*=UTF-8''..%2F..%2Fevil%22%0d%0aX-Bad%3A%201.html`,
      }),
    );

    const response = await downloadRequest(ticketId, messageId);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    const disposition = response.headers.get("content-disposition") ?? "";
    expect(disposition.startsWith("attachment; ")).toBe(true);
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).not.toContain("/");
    expect(disposition).toContain('filename="evil___X-Bad_ 1.html"');
  });

  it("falls back to a typed default name", async () => {
    signedInAs("ops");
    downloadFromBackend.mockResolvedValue(upstream(pdfBytes, { "content-type": "image/png" }));

    const response = await downloadRequest(ticketId, messageId);
    expect(response.headers.get("content-disposition")).toContain('filename="attachment.png"');
  });

  it("rejects non-uuid ids before calling the backend", async () => {
    signedInAs("owner");

    for (const [id, message] of [
      ["..", messageId],
      [ticketId, "..%2F..%2Fstaff"],
    ] as const) {
      const response = await downloadRequest(id, message);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(downloadFromBackend).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    anonymous();
    const response = await downloadRequest(ticketId, messageId);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");

    signedInAs("support", undefined, { mustChangePassword: true });
    expect((await downloadRequest(ticketId, messageId)).status).toBe(403);
    expect(downloadFromBackend).not.toHaveBeenCalled();
  });

  it("maps backend errors", async () => {
    signedInAs("support");
    downloadFromBackend.mockResolvedValue({ ok: false, status: 404, error: { code: "not_found", message: "Attachment not found" } });
    const missing = await downloadRequest(ticketId, messageId);
    expect(missing.status).toBe(404);
    expect(await readJson(missing)).toEqual({ error: { code: "not_found", message: "Attachment not found" } });

    downloadFromBackend.mockResolvedValue({ ok: false, status: 401, error: { code: "unauthorized", message: "expired" } });
    expect((await downloadRequest(ticketId, messageId)).status).toBe(401);
  });
});
