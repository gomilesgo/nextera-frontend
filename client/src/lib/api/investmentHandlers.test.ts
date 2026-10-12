import { describe, expect, it, vi } from "vitest";
import type { BackendBinary, BackendResult } from "@/lib/backend/client";
import { clearSessionCookieHeader } from "./handlers";
import type { HandlerDeps } from "./handlers";
import {
  MAX_PDF_BYTES,
  dispositionFrom,
  documentFileHandler,
  documentsHandler,
  fileNameFrom,
  investmentFileHandler,
  investmentHandler,
  investmentSummaryHandler,
  investmentsHandler,
  paymentStatusHandler,
  safePdfName,
  statementPath,
  statementsHandler,
} from "./investmentHandlers";

const ID = "6f1c2a0e-3b4d-4c5e-8f90-123456789abc";
const OTHER = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const investment = {
  id: ID,
  planId: "p1",
  planSlug: "steady-12",
  planName: "Steady 12",
  principalPaise: 135_000_000,
  rateBps: 800,
  tenureMonths: 12,
  monthlyReturnPaise: 900_000,
  status: "active",
  startDate: "2026-10-01",
  maturityDate: "2027-10-01",
  bondNo: "NXB-2026-000001",
  consentedAt: "2026-10-01T05:00:00.000Z",
  activatedAt: "2026-10-01T05:10:00.000Z",
  maturedAt: null,
  cancelledAt: null,
  createdAt: "2026-10-01T04:55:00.000Z",
};

const growth = {
  principalBalancePaise: 135_000_000,
  creditedGrossPaise: 900_000,
  creditedNetPaise: 810_000,
  tdsPaise: 90_000,
  periodsCredited: 1,
  nextCreditDate: "2026-12-01",
  nextCreditPaise: 900_000,
  scheduleIsIndicative: false,
  schedule: [
    { periodNo: 1, dueDate: "2026-11-01", grossPaise: 900_000, cumulativePaise: 900_000, credited: true, netPaise: 810_000, tdsPaise: 90_000 },
    { periodNo: 2, dueDate: "2026-12-01", grossPaise: 900_000, cumulativePaise: 1_800_000, credited: false, netPaise: null, tdsPaise: null },
  ],
};

const document = {
  id: OTHER,
  kind: "agreement",
  investmentId: ID,
  fileName: "nextera-agreement-6f1c2a0e.pdf",
  sha256: "ab".repeat(32),
  sizeBytes: 2048,
  acceptedAt: "2026-10-01T05:00:00.000Z",
  createdAt: "2026-10-01T04:55:00.000Z",
};

const payment = {
  id: OTHER,
  orderId: "nxp_abc",
  amountPaise: 135_000_000,
  status: "paid",
  gatewayStatus: "PAID",
  expiresAt: "2026-10-01T05:30:00.000Z",
  paidAt: "2026-10-01T05:09:00.000Z",
  createdAt: "2026-10-01T05:00:00.000Z",
};

const expiredSession: BackendResult<never> = {
  ok: false,
  status: 401,
  error: { code: "unauthorized", message: "Session expired" },
};

function callWith(results: Record<string, BackendResult<unknown>>) {
  const call = vi.fn(async (path: string) => {
    if (path === "/v1/ping") return { ok: true as const, status: 200, data: { service: "portal" } };
    const match = Object.entries(results).find(([prefix]) => path.startsWith(prefix));
    if (!match) throw new Error(`unexpected path ${path}`);
    return match[1];
  });
  return call;
}

function deps(results: Record<string, BackendResult<unknown>>, token: string | null = "tok") {
  const call = callWith(results);
  return { call, deps: { token, call: call as unknown as HandlerDeps["call"] } };
}

async function read(response: Response) {
  return { status: response.status, body: await response.json(), headers: response.headers };
}

describe("investment read handlers", () => {
  it("lists validated investments without caching", async () => {
    const { call, deps: d } = deps({ "/v1/investments": { ok: true, status: 200, data: { investments: [investment] } } });

    const { status, body, headers } = await read(await investmentsHandler(d));

    expect(call).toHaveBeenCalledWith("/v1/investments", { token: "tok" });
    expect(status).toBe(200);
    expect(body).toEqual({ investments: [investment] });
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("answers 401 and clears the cookie without calling the backend when signed out", async () => {
    const { call, deps: d } = deps({}, null);

    for (const response of [
      await investmentsHandler(d),
      await investmentHandler(d, ID),
      await paymentStatusHandler(d, ID),
      await documentsHandler(d),
      await statementsHandler(d, null),
      await investmentSummaryHandler(d),
    ]) {
      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBe(clearSessionCookieHeader());
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(call).not.toHaveBeenCalled();
  });

  it("clears the cookie when the backend says the session expired", async () => {
    const { deps: d } = deps({ "/v1/investments": expiredSession });

    const { status, body, headers } = await read(await investmentsHandler(d));

    expect(status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("keeps the session when the backend rejects the service key itself", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const call = vi.fn(async () => expiredSession);

    const response = await documentsHandler({ token: "tok", call: call as unknown as HandlerDeps["call"] });

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/NEXTERA_PORTAL_SERVICE_KEY/));
    errorLog.mockRestore();
  });

  it("rejects ids that are not UUIDs before calling the backend", async () => {
    const { call, deps: d } = deps({});

    for (const bad of ["../plans", "1", `${ID}/agreement`, "%2e%2e"]) {
      expect((await investmentHandler(d, bad)).status).toBe(404);
      expect((await paymentStatusHandler(d, bad)).status).toBe(404);
    }
    expect(call).not.toHaveBeenCalled();
  });

  it("returns the investment detail and refuses malformed shapes", async () => {
    const good = deps({ [`/v1/investments/${ID}`]: { ok: true, status: 200, data: { investment, growth, documents: [document], payment } } });
    const { status, body } = await read(await investmentHandler(good.deps, ID));
    expect(status).toBe(200);
    expect(body.investment.bondNo).toBe("NXB-2026-000001");
    expect(body.growth.schedule).toHaveLength(2);

    const bad = deps({ [`/v1/investments/${ID}`]: { ok: true, status: 200, data: { investment: { ...investment, principalPaise: "1" }, growth, documents: [] } } });
    const broken = await read(await investmentHandler(bad.deps, ID));
    expect(broken.status).toBe(502);
    expect(broken.body.error.code).toBe("internal");
  });

  it("passes the payment status through and hides unsafe backend messages", async () => {
    const { deps: d } = deps({ [`/v1/investments/${ID}/payment`]: { ok: true, status: 200, data: { investment, payment } } });
    const { body } = await read(await paymentStatusHandler(d, ID));
    expect(body.payment.status).toBe("paid");

    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = deps({
      [`/v1/investments/${ID}/payment`]: { ok: false, status: 500, error: { code: "internal", message: "relation payments does not exist" } },
    });
    const failed = await read(await paymentStatusHandler(failing.deps, ID));
    expect(failed.status).toBe(500);
    expect(failed.body.error.message).not.toMatch(/relation/);
    errorLog.mockRestore();
  });
});

describe("investmentSummaryHandler", () => {
  it("adds credited returns across active and matured investments only", async () => {
    const pending = { ...investment, id: OTHER, status: "pending_payment", startDate: null, maturityDate: null, bondNo: null, activatedAt: null };
    const { call, deps: d } = deps({
      [`/v1/investments/${ID}`]: { ok: true, status: 200, data: { investment, growth, documents: [], payment: null } },
      "/v1/investments": { ok: true, status: 200, data: { investments: [investment, pending] } },
    });

    const { status, body } = await read(await investmentSummaryHandler(d));

    expect(status).toBe(200);
    expect(body.summary).toMatchObject({
      activeCount: 1,
      pendingCount: 1,
      investedPaise: 135_000_000,
      creditedNetPaise: 810_000,
      nextCredit: { date: "2026-12-01", paise: 900_000, investmentId: ID },
      complete: true,
    });
    expect(call).not.toHaveBeenCalledWith(`/v1/investments/${OTHER}`, expect.anything());
  });

  it("tolerates one failing detail and marks the totals incomplete", async () => {
    const second = { ...investment, id: OTHER };
    const { deps: d } = deps({
      [`/v1/investments/${ID}`]: { ok: true, status: 200, data: { investment, growth, documents: [], payment: null } },
      [`/v1/investments/${OTHER}`]: { ok: false, status: 503, error: { code: "unavailable", message: "down" } },
      "/v1/investments": { ok: true, status: 200, data: { investments: [investment, second] } },
    });

    const { status, body } = await read(await investmentSummaryHandler(d));

    expect(status).toBe(200);
    expect(body.summary).toMatchObject({ activeCount: 2, investedPaise: 270_000_000, creditedNetPaise: 810_000, complete: false });
  });

  it("still signs the customer out when a detail read reports an expired session", async () => {
    const { deps: d } = deps({
      [`/v1/investments/${ID}`]: { ok: false, status: 401, error: { code: "unauthorized", message: "expired" } },
      "/v1/investments": { ok: true, status: 200, data: { investments: [investment] } },
    });
    const response = await investmentSummaryHandler(d);
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("statements", () => {
  it("builds the backend path with a bounded page size and validated cursor", () => {
    expect(statementPath(null)).toBe("/v1/statements?limit=25");
    expect(statementPath("1042")).toBe("/v1/statements?limit=25&cursor=1042");
    expect(statementPath("abc")).toBeNull();
    expect(statementPath("1&limit=500")).toBeNull();
  });

  it("refuses a bad cursor with 400 before calling the backend", async () => {
    const { call, deps: d } = deps({});
    const { status, body } = await read(await statementsHandler(d, "x;drop"));
    expect(status).toBe(400);
    expect(body.error.code).toBe("validation");
    expect(call).not.toHaveBeenCalled();
  });

  it("returns pages without memos or internal references", async () => {
    const entry = {
      id: "e1",
      transactionId: "t1",
      account: "wallet",
      investmentId: null,
      direction: "credit",
      amountPaise: 810_000,
      refType: "accrual",
      refId: "a1",
      memo: `Return for period 1 of investment ${ID}, due 2026-11-01`,
      createdAt: "2026-11-01T00:30:00.000Z",
    };
    const { deps: d } = deps({ "/v1/statements": { ok: true, status: 200, data: { entries: [entry], nextCursor: "17" } } });
    const { body } = await read(await statementsHandler(d, null));
    expect(body).toEqual({
      entries: [
        {
          id: "e1",
          account: "wallet",
          direction: "credit",
          amountPaise: 810_000,
          refType: "accrual",
          investmentId: ID,
          periodNo: 1,
          createdAt: "2026-11-01T00:30:00.000Z",
        },
      ],
      nextCursor: "17",
    });
  });
});

function pdfResult(headers: Record<string, string> = { "content-type": "application/pdf" }): BackendResult<BackendBinary> {
  return { ok: true, status: 200, data: { bytes: new Uint8Array([37, 80, 68, 70]), headers: new Headers(headers) } };
}

function fileDeps(result: BackendResult<unknown>, token: string | null = "tok") {
  const call = vi.fn(async (path: string) =>
    path === "/v1/ping" ? { ok: true as const, status: 200, data: { service: "portal" } } : result,
  );
  return { call, deps: { token, call: call as unknown as HandlerDeps["call"] } };
}

describe("PDF handlers", () => {
  it("sends the agreement inline with safe headers through the shared client", async () => {
    const { call, deps: d } = fileDeps(
      pdfResult({ "content-type": "application/pdf", "content-disposition": 'attachment; filename="nextera-agreement-6f1c2a0e.pdf"' }),
    );

    const response = await investmentFileHandler(d, ID, "agreement", "inline");

    expect(call).toHaveBeenCalledWith(`/v1/investments/${ID}/agreement`, { token: "tok", binary: true, maxBytes: MAX_PDF_BYTES });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('inline; filename="nextera-agreement-6f1c2a0e.pdf"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("content-length")).toBe("4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it("offers attachments on request and never trusts the upstream file name", async () => {
    const { deps: d } = fileDeps(pdfResult());

    const response = await documentFileHandler(d, OTHER, "attachment");

    expect(response.headers.get("content-disposition")).toBe(`attachment; filename="nextera-document-0a1b2c3d.pdf"`);
    expect(safePdfName('evil"; x=.pdf', "f.pdf")).toBe("evil___x_.pdf");
    expect(safePdfName("report.html", "f.pdf")).toBe("f.pdf");
    expect(fileNameFrom('attachment; filename="../x.pdf"')).toBeNull();
  });

  it("refuses anything that is not a PDF", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps: d } = fileDeps(pdfResult({ "content-type": "text/html" }));
    expect((await documentFileHandler(d, OTHER, "inline")).status).toBe(502);
  });

  it("reads the disposition from the download flag", () => {
    expect(dispositionFrom(new URL("https://x/api/a?download=1"))).toBe("attachment");
    expect(dispositionFrom(new URL("https://x/api/a"))).toBe("inline");
    expect(dispositionFrom(new URL("https://x/api/a?download=true"))).toBe("inline");
  });

  it("validates ids and sessions before fetching any file", async () => {
    const signedOut = fileDeps(pdfResult(), null);
    const anonymous = await investmentFileHandler(signedOut.deps, ID, "bond", "inline");
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("set-cookie")).toBe(clearSessionCookieHeader());

    const badId = fileDeps(pdfResult());
    expect((await investmentFileHandler(badId.deps, "x", "bond", "inline")).status).toBe(404);
    expect((await documentFileHandler(badId.deps, "../../v1/plans", "inline")).status).toBe(404);
    expect(badId.call).not.toHaveBeenCalled();
    expect(signedOut.call).not.toHaveBeenCalled();
  });

  it("maps a missing bond to a JSON 404 and an expired session to 401", async () => {
    const missing = fileDeps({ ok: false, status: 404, error: { code: "not_found", message: "This investment has no bond yet" } });
    const notReady = await read(await investmentFileHandler(missing.deps, ID, "bond", "inline"));
    expect(notReady.status).toBe(404);
    expect(notReady.headers.get("cache-control")).toBe("no-store");

    const expired = fileDeps({ ok: false, status: 401, error: { code: "unauthorized", message: "expired" } });
    const lost = await investmentFileHandler(expired.deps, ID, "agreement", "inline");
    expect(lost.status).toBe(401);
    expect(lost.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
