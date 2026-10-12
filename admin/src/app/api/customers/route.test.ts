import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anonymous,
  backendCalls,
  callBackend,
  context,
  expired,
  fail,
  incomingHeaders,
  ok,
  resetHarness,
  signedInAs,
} from "@/test/routeHarness";

vi.mock("next/headers", async () => {
  const harness = await import("@/test/routeHarness");
  return { cookies: async () => harness.cookieStore, headers: async () => harness.incomingHeaders.current };
});

vi.mock("@/lib/backend/server", async () => {
  const harness = await import("@/test/routeHarness");
  return { callBackend: (...args: Parameters<typeof harness.callBackend>) => harness.callBackend(...args) };
});

const list = await import("./route");
const detail = await import("./[id]/route");
const ledger = await import("./[id]/ledger/route");
const exportCsv = await import("./[id]/ledger/export/route");

const customerId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";

const customer = {
  id: customerId,
  phone: "+919876543210",
  name: "Asha Rao",
  email: null,
  status: "active",
  kycStatus: "verified",
  createdVia: "admin",
  createdAt: "2026-10-01T04:30:00.000Z",
  updatedAt: "2026-10-01T04:30:00.000Z",
};

const customerDetail = {
  customer,
  kyc: { status: "verified", panMasked: "ABCxxxx4F", panName: "ASHA RAO", submittedAt: null, verifiedAt: null, rejectionReason: null },
  bankAccounts: [],
  balances: [{ account: "wallet", balancePaise: 150_000 }],
  totalBalancePaise: 150_000,
};

const ledgerPage = {
  items: [
    {
      id: "e1",
      transactionId: "t1",
      at: "2026-10-02T04:30:00.000Z",
      account: "wallet",
      direction: "credit",
      amountPaise: 150_000,
      runningBalancePaise: 150_000,
      description: "Opening credit",
      refType: "manual_adjustment",
      refId: customerId,
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
};

function get(path: string) {
  return new Request(`http://admin.test${path}`);
}

async function expectEnvelope(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ error: { code } });
}

beforeEach(() => {
  resetHarness();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/customers", () => {
  it("returns 401 to anonymous and expired callers without reading customers", async () => {
    anonymous();
    await expectEnvelope(await list.GET(get("/api/customers")), 401, "unauthorized");
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    await expectEnvelope(await list.GET(get("/api/customers")), 401, "unauthorized");
    expect(backendCalls()).toEqual([]);
  });

  it("returns 403 while a password change is pending", async () => {
    signedInAs("ops", () => ok({ items: [], total: 0, limit: 25, offset: 0 }), { mustChangePassword: true });
    await expectEnvelope(await list.GET(get("/api/customers")), 403, "password_change_required");
    expect(backendCalls()).toEqual([]);
  });

  it("lets support read the list with the filters forwarded", async () => {
    signedInAs("support", () => ok({ items: [customer], total: 1, limit: 25, offset: 25 }));
    const response = await list.GET(get("/api/customers?status=active&q=asha&limit=25&offset=25&createdFrom=2026-10-01"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ items: [customer], total: 1, limit: 25, offset: 25 });
    expect(backendCalls()).toEqual([
      ["/v1/admin/customers?status=active&q=asha&createdFrom=2026-10-01&limit=25&offset=25", { token: "token-1" }],
    ]);
  });

  it("rejects invalid filters with field errors before calling the backend", async () => {
    signedInAs("owner");
    const response = await list.GET(get("/api/customers?status=deleted&createdFrom=2026-10-10&createdTo=2026-10-01"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation");
    expect(Object.keys(body.error.fields)).toContain("status");
    expect(backendCalls()).toEqual([]);
  });

  it("maps backend failures and malformed payloads", async () => {
    signedInAs("owner", () => fail(401, "unauthorized"));
    await expectEnvelope(await list.GET(get("/api/customers")), 401, "unauthorized");

    signedInAs("owner", () => fail(403, "forbidden"));
    await expectEnvelope(await list.GET(get("/api/customers")), 403, "forbidden");

    signedInAs("owner", () => ok({ items: [{ id: 1 }], total: 1, limit: 25, offset: 0 }));
    const response = await list.GET(get("/api/customers"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal", message: "Something went wrong" } });
  });
});

describe("GET /api/customers/[id]", () => {
  it("returns the detail with no-store", async () => {
    signedInAs("support", () => ok(customerDetail));
    const response = await detail.GET(get(`/api/customers/${customerId}`), context({ id: customerId }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(customerDetail);
    expect(backendCalls()).toEqual([[`/v1/admin/customers/${customerId}`, { token: "token-1" }]]);
  });

  it("answers malformed ids with 404 without calling the backend", async () => {
    signedInAs("owner");
    await expectEnvelope(await detail.GET(get("/api/customers/x"), context({ id: "../staff" })), 404, "not_found");
    expect(backendCalls()).toEqual([]);
  });

  it("returns 401 to anonymous callers", async () => {
    anonymous();
    await expectEnvelope(await detail.GET(get("/api/customers/x"), context({ id: customerId })), 401, "unauthorized");
  });
});

describe("GET /api/customers/[id]/ledger", () => {
  it("forwards the account and window", async () => {
    signedInAs("ops", () => ok(ledgerPage));
    const response = await ledger.GET(
      get(`/api/customers/${customerId}/ledger?account=wallet&limit=50&offset=0`),
      context({ id: customerId }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(ledgerPage);
    expect(backendCalls()).toEqual([
      [`/v1/admin/customers/${customerId}/ledger?account=wallet&limit=50&offset=0`, { token: "token-1" }],
    ]);
  });

  it("rejects page sizes over the backend limit", async () => {
    signedInAs("ops");
    const response = await ledger.GET(get(`/api/customers/${customerId}/ledger?limit=500`), context({ id: customerId }));
    expect(response.status).toBe(400);
    expect(backendCalls()).toEqual([]);
  });
});

describe("GET /api/customers/[id]/ledger/export", () => {
  function stubBackend(response: () => Response) {
    vi.stubEnv("NEXTERA_BACKEND_URL", "https://api.example.test");
    vi.stubEnv("NEXTERA_ADMIN_SERVICE_KEY", "admin-service-key-123");
    const fetchMock = vi.fn<typeof fetch>(async () => response());
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("streams the backend CSV as an attachment that is never cached", async () => {
    signedInAs("support");
    incomingHeaders.current = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Browser" });
    const csv = "\uFEFFat,account\r\n2026-10-02T04:30:00.000Z,wallet\r\n";
    const fetchMock = stubBackend(
      () => new Response(csv, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } }),
    );

    const response = await exportCsv.GET(
      get(`/api/customers/${customerId}/ledger/export?account=wallet`),
      context({ id: customerId }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toMatch(
      new RegExp(`^attachment; filename="nextera-customer-${customerId}-ledger-wallet-\\d{4}-\\d{2}-\\d{2}\\.csv"$`),
    );
    expect(response.body).toBeInstanceOf(ReadableStream);
    expect(new Uint8Array(await response.arrayBuffer()).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`https://api.example.test/v1/admin/customers/${customerId}/ledger.csv?account=wallet`);
    const sent = new Headers(init?.headers);
    expect(sent.get("x-service-key")).toBe("admin-service-key-123");
    expect(sent.get("authorization")).toBe("Bearer token-1");
    expect(sent.get("x-client-ip")).toBe("203.0.113.7");
    expect(sent.get("x-client-user-agent")).toBe("Browser");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
  });

  it("passes export_too_large through as a JSON envelope", async () => {
    signedInAs("owner");
    stubBackend(() =>
      Response.json(
        { error: { code: "export_too_large", message: "This ledger has more than 50000 entries" } },
        { status: 422 },
      ),
    );
    const response = await exportCsv.GET(get(`/api/customers/${customerId}/ledger/export`), context({ id: customerId }));
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(await response.json()).toEqual({
      error: { code: "export_too_large", message: "This ledger has more than 50000 entries" },
    });
  });

  it("maps an expired backend session to 401 and an outage to 503", async () => {
    signedInAs("owner");
    stubBackend(() => Response.json({ error: { code: "unauthorized", message: "expired" } }, { status: 401 }));
    await expectEnvelope(
      await exportCsv.GET(get(`/api/customers/${customerId}/ledger/export`), context({ id: customerId })),
      401,
      "unauthorized",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expectEnvelope(
      await exportCsv.GET(get(`/api/customers/${customerId}/ledger/export`), context({ id: customerId })),
      503,
      "unavailable",
    );
  });

  it("refuses anonymous callers and malformed ids before contacting the backend", async () => {
    const fetchMock = stubBackend(() => new Response("x"));
    anonymous();
    await expectEnvelope(
      await exportCsv.GET(get(`/api/customers/${customerId}/ledger/export`), context({ id: customerId })),
      401,
      "unauthorized",
    );
    signedInAs("owner");
    await expectEnvelope(
      await exportCsv.GET(get("/api/customers/x/ledger/export"), context({ id: "not-a-uuid" })),
      404,
      "not_found",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
