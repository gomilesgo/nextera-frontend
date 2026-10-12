import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { flag, flagId, investmentId, payment, paymentId } from "@/test/investments";
import { anonymous, callBackend, fail, ok, readJson, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const payments = await import("./route");
const paymentDetail = await import("./[id]/route");
const flags = await import("./flags/route");
const flagDetail = await import("./flags/[id]/route");

function paymentsRequest(search = "") {
  return payments.GET(new NextRequest(`http://admin.test/api/payments${search}`));
}

function paymentRequest(id: string) {
  return paymentDetail.GET(new Request(`http://admin.test/api/payments/${id}`), { params: Promise.resolve({ id }) });
}

function flagsRequest(search = "") {
  return flags.GET(new NextRequest(`http://admin.test/api/payments/flags${search}`));
}

function flagRequest(id: string) {
  return flagDetail.GET(new Request(`http://admin.test/api/payments/flags/${id}`), { params: Promise.resolve({ id }) });
}

beforeEach(resetStaffMocks);

describe("GET /api/payments", () => {
  it("lists payments with the status filter and no caching", async () => {
    signedInAs("support", () => ok({ payments: [payment] }));

    const response = await paymentsRequest(`?status=paid&investmentId=${investmentId}&limit=100`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ payments: [payment] });
    expect(writes()).toEqual([
      [`/v1/admin/payments?status=paid&investmentId=${investmentId}&limit=100`, { token: "token-1" }],
    ]);
  });

  it("rejects invalid filters before calling the backend", async () => {
    signedInAs("owner");
    for (const search of ["?status=refunded", "?investmentId=abc", "?limit=0"]) {
      expect((await paymentsRequest(search)).status).toBe(400);
    }
    expect(writes()).toEqual([]);
  });

  it("answers 401 without a session", async () => {
    anonymous();
    const response = await paymentsRequest();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("refuses malformed payments", async () => {
    signedInAs("ops", () => ok({ payments: [{ ...payment, amountPaise: "1350000" }] }));
    expect((await paymentsRequest()).status).toBe(500);
  });
});

describe("GET /api/payments/[id]", () => {
  it("returns payment detail with no-store headers", async () => {
    signedInAs("support", () => ok({ payment }));

    const response = await paymentRequest(paymentId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ payment });
    expect(writes()).toEqual([[`/v1/admin/payments/${paymentId}`, { token: "token-1" }]]);
  });

  it("answers 404 for a non-uuid id without calling the backend", async () => {
    signedInAs("owner");
    expect((await paymentRequest("not-a-uuid")).status).toBe(404);
    expect(writes()).toEqual([]);
  });

  it("maps backend 404 to 404", async () => {
    signedInAs("ops", () => fail("not_found", "Payment not found", 404));
    expect((await paymentRequest(paymentId)).status).toBe(404);
  });

  it("answers 401 without a session", async () => {
    anonymous();
    expect((await paymentRequest(paymentId)).status).toBe(401);
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("refuses malformed payment response", async () => {
    signedInAs("ops", () => ok({ payment: { ...payment, amountPaise: "bad" } }));
    expect((await paymentRequest(paymentId)).status).toBe(500);
  });
});

describe("GET /api/payments/flags", () => {
  it("lists open flags by default", async () => {
    signedInAs("support", () => ok({ flags: [flag], total: 1 }));

    const response = await flagsRequest();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ flags: [flag], total: 1 });
    expect(writes()).toEqual([["/v1/admin/payments/flags?state=open&limit=50", { token: "token-1" }]]);
  });

  it("lists resolved flags", async () => {
    signedInAs("ops", () => ok({ flags: [], total: 0 }));
    await flagsRequest("?state=resolved&limit=200");
    expect(writes()[0]?.[0]).toBe("/v1/admin/payments/flags?state=resolved&limit=200");
  });

  it("rejects an unknown state", async () => {
    signedInAs("ops");
    expect((await flagsRequest("?state=all")).status).toBe(400);
    expect(writes()).toEqual([]);
  });

  it("refuses an event without a flag reason", async () => {
    signedInAs("ops", () => ok({ flags: [{ ...flag, flagReason: null }], total: 1 }));
    expect((await flagsRequest()).status).toBe(500);
  });

  it("passes a password change requirement through as 403", async () => {
    signedInAs("ops", () => fail("password_change_required", "Change your password to continue.", 403));
    const response = await flagsRequest();
    expect(response.status).toBe(403);
    expect(await readJson(response)).toMatchObject({ error: { code: "password_change_required" } });
  });
});

describe("GET /api/payments/flags/[id]", () => {
  it("returns flag detail with payment via direct backend lookup", async () => {
    signedInAs("support", () => ok({ flag, payment }));

    const response = await flagRequest(flagId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await readJson(response)).toEqual({ flag, payment });
    expect(writes()).toEqual([[`/v1/admin/payments/flags/${flagId}`, { token: "token-1" }]]);
  });

  it("handles a flag with null payment", async () => {
    signedInAs("ops", () => ok({ flag, payment: null }));
    const response = await flagRequest(flagId);
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ flag, payment: null });
  });

  it("answers 404 when the backend returns not_found", async () => {
    signedInAs("owner", () => fail("not_found", "Payment flag not found", 404));
    expect((await flagRequest(flagId)).status).toBe(404);
  });

  it("answers 404 for a non-uuid id without calling the backend", async () => {
    signedInAs("owner");
    const malformed = await flagRequest("../../staff");
    expect(malformed.status).toBe(404);
    expect(writes()).toEqual([]);
  });

  it("answers 401 without a session", async () => {
    anonymous();
    expect((await flagRequest(flagId)).status).toBe(401);
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("refuses a response with a malformed flag", async () => {
    signedInAs("ops", () => ok({ flag: { ...flag, flagReason: "unknown_code" }, payment: null }));
    expect((await flagRequest(flagId)).status).toBe(500);
  });
});
