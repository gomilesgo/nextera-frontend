import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { customerId } from "@/test/fixtures";
import { documentId, investment, investmentDetail, investmentId, planId } from "@/test/investments";
import { anonymous, callBackend, expired, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const list = await import("./route");
const detail = await import("./[id]/route");
const file = await import("./[id]/documents/[documentId]/route");

const pdfBytes = new TextEncoder().encode("%PDF-1.7\n%test\n");

function listRequest(search = "") {
  return list.GET(new NextRequest(`http://admin.test/api/investments${search}`));
}

function detailRequest(id: string) {
  return detail.GET(new Request(`http://admin.test/api/investments/${id}`), { params: Promise.resolve({ id }) });
}

function fileRequest(id: string, docId: string) {
  return file.GET(new Request(`http://admin.test/api/investments/${id}/documents/${docId}`), {
    params: Promise.resolve({ id, documentId: docId }),
  });
}

const backendFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  resetStaffMocks();
  backendFetch.mockReset();
  vi.stubEnv("NEXTERA_BACKEND_URL", "http://backend.test/");
  vi.stubEnv("NEXTERA_ADMIN_SERVICE_KEY", "admin-service-key-123");
  vi.stubGlobal("fetch", backendFetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/investments", () => {
  it("returns a page of investments without caching", async () => {
    signedInAs("support", () => ok({ investments: [investment], nextCursor: "next==" }));

    const response = await listRequest(`?status=active&customerId=${customerId}&planId=${planId}&cursor=abc&limit=50`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ investments: [investment], nextCursor: "next==" });
    expect(writes()).toEqual([
      [
        `/v1/admin/investments?status=active&planId=${planId}&customerId=${customerId}&cursor=abc&limit=50`,
        { token: "token-1" },
      ],
    ]);
  });

  it("defaults the page size", async () => {
    signedInAs("ops", () => ok({ investments: [], nextCursor: null }));

    await listRequest();
    expect(writes()[0]?.[0]).toBe("/v1/admin/investments?limit=50");
  });

  it("rejects invalid filters before calling the backend", async () => {
    signedInAs("owner");

    for (const search of ["?status=bogus", "?customerId=not-a-uuid", "?planId=1", "?limit=500"]) {
      const response = await listRequest(search);
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await readJson(response)).toMatchObject({ error: { code: "validation" } });
    }
    expect(writes()).toEqual([]);
  });

  it("answers 401 without a session and 403 while a password change is pending", async () => {
    anonymous();
    const unauthenticated = await listRequest();
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("cache-control")).toBe("no-store");
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    expect((await listRequest()).status).toBe(401);

    signedInAs("ops", undefined, { mustChangePassword: true });
    const pending = await listRequest();
    expect(pending.status).toBe(403);
    expect(await readJson(pending)).toMatchObject({ error: { code: "password_change_required" } });
    expect(writes()).toEqual([]);
  });

  it("maps backend errors and malformed payloads", async () => {
    signedInAs("ops", () => fail("forbidden", "Your role does not allow this action", 403));
    expect((await listRequest()).status).toBe(403);

    signedInAs("ops", () => fail("validation", "Invalid cursor", 400, { cursor: ["Invalid cursor"] }));
    const badCursor = await listRequest("?cursor=zzz");
    expect(badCursor.status).toBe(400);
    expect(await readJson(badCursor)).toMatchObject({ error: { fields: { cursor: ["Invalid cursor"] } } });

    signedInAs("ops", () => ok({ investments: [{ id: "x" }], nextCursor: null }));
    const malformed = await listRequest();
    expect(malformed.status).toBe(500);
    expect(await readJson(malformed)).toEqual({ error: { code: "internal", message: "Something went wrong" } });

    signedInAs("ops", () => fail("unavailable", "Could not reach the server. Please try again.", 503));
    expect((await listRequest()).status).toBe(503);
  });
});

describe("GET /api/investments/[id]", () => {
  it("returns the detail with payments, events and documents for any staff", async () => {
    signedInAs("support", () => ok(investmentDetail));

    const response = await detailRequest(investmentId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual(investmentDetail);
    expect(writes()).toEqual([[`/v1/admin/investments/${investmentId}`, { token: "token-1" }]]);
  });

  it("answers 404 for a non-uuid id without calling the backend", async () => {
    signedInAs("owner");

    const response = await detailRequest("..%2F..%2Fstaff");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(writes()).toEqual([]);
  });

  it("refuses a detail with a malformed event list", async () => {
    signedInAs("owner", () => ok({ ...investmentDetail, events: [{ id: "x", payload: "<script>" }] }));
    expect((await detailRequest(investmentId)).status).toBe(500);
  });

  it("passes not found through", async () => {
    signedInAs("owner", () => fail("not_found", "Investment not found", 404));
    expect((await detailRequest(investmentId)).status).toBe(404);
  });
});

describe("GET /api/investments/[id]/documents/[documentId]", () => {
  function pdf(init: ResponseInit = {}) {
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(pdfBytes.byteLength),
        "content-disposition": 'attachment; filename="bond-NXB-2026-000001.pdf"',
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  }

  it("streams the PDF inline with no-store and nosniff", async () => {
    signedInAs("support");
    backendFetch.mockResolvedValue(pdf());

    const response = await fileRequest(investmentId, documentId);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('inline; filename="bond-NXB-2026-000001.pdf"');
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-length")).toBe(String(pdfBytes.byteLength));
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdfBytes);

    const [url, init] = backendFetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(`http://backend.test/v1/admin/investments/${investmentId}/documents/${documentId}/file`);
    const sent = new Headers(init?.headers);
    expect(sent.get("x-service-key")).toBe("admin-service-key-123");
    expect(sent.get("authorization")).toBe("Bearer token-1");
    expect(sent.get("accept")).toContain("application/pdf");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
  });

  it("sanitises the file name from the backend", async () => {
    signedInAs("owner");
    backendFetch.mockResolvedValue(pdf({ headers: { "content-disposition": 'attachment; filename="../evil name.exe"' } }));

    const response = await fileRequest(investmentId, documentId);
    expect(response.headers.get("content-disposition")).toBe('inline; filename="evil_name.exe.pdf"');
  });

  it("rejects non-uuid ids without calling the backend", async () => {
    signedInAs("owner");

    for (const [id, docId] of [
      ["..", documentId],
      [investmentId, "..%2Ffile"],
      [investmentId, `${documentId}/../x`],
    ] as const) {
      const response = await fileRequest(id, docId);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toContain("application/json");
    }
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("sends an expired session to the login page and back to the investment", async () => {
    expired();
    const response = await fileRequest(investmentId, documentId);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`/login?expired=1&next=%2Finvestments%2F${investmentId}`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(backendFetch).not.toHaveBeenCalled();

    anonymous();
    expect((await fileRequest(investmentId, documentId)).headers.get("location")).toContain("/login?expired=1&next=");
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("sends a pending password change to the password page", async () => {
    signedInAs("ops", undefined, { mustChangePassword: true });
    const response = await fileRequest(investmentId, documentId);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/account/password");
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("drops content-length when the backend body is encoded", async () => {
    signedInAs("owner");
    backendFetch.mockResolvedValue(pdf({ headers: { "content-encoding": "gzip" } }));

    const response = await fileRequest(investmentId, documentId);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBeNull();
  });

  it("refuses a non-PDF body from the backend", async () => {
    signedInAs("owner");
    backendFetch.mockResolvedValue(new Response("<html><script>alert(1)</script></html>", { headers: { "content-type": "text/html" } }));

    const response = await fileRequest(investmentId, documentId);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await readJson(response)).toEqual({ error: { code: "internal", message: "Something went wrong" } });
  });

  it("maps backend errors and outages", async () => {
    signedInAs("owner");
    backendFetch.mockResolvedValue(Response.json({ error: { code: "not_found", message: "Document not found" } }, { status: 404 }));
    const missing = await fileRequest(investmentId, documentId);
    expect(missing.status).toBe(404);
    expect(await readJson(missing)).toEqual({ error: { code: "not_found", message: "Document not found" } });

    backendFetch.mockRejectedValue(new TypeError("fetch failed"));
    const down = await fileRequest(investmentId, documentId);
    expect(down.status).toBe(503);
    expect(down.headers.get("cache-control")).toBe("no-store");
  });
});
