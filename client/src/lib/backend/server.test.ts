import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "192.0.2.44", "user-agent": "Mozilla/5.0" }),
}));

const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ service: "portal" }));

beforeAll(() => {
  vi.stubEnv("NEXTERA_BACKEND_URL", "https://api.example.test");
  vi.stubEnv("NEXTERA_PORTAL_SERVICE_KEY", "portal-service-key-0001");
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

beforeEach(() => fetchMock.mockClear());

const { callBackend, callBackendFor, callPublicBackend } = await import("./server");

function sentHeaders(): Headers {
  const init = fetchMock.mock.calls[0]?.[1];
  return new Headers(init?.headers);
}

describe("visitor IP forwarding", () => {
  it("sends the first x-forwarded-for entry as x-client-ip and keeps x-forwarded-for", async () => {
    await callBackendFor(new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }), "/v1/ping");

    const headers = sentHeaders();
    expect(headers.get("x-client-ip")).toBe("198.51.100.7");
    expect(headers.get("x-forwarded-for")).toBe("198.51.100.7");
  });

  it("falls back to x-real-ip from the incoming request", async () => {
    await callBackend("/v1/ping");

    expect(sentHeaders().get("x-client-ip")).toBe("192.0.2.44");
  });

  it("forwards IPv6 addresses", async () => {
    await callBackendFor(new Headers({ "x-forwarded-for": "2001:db8::7" }), "/v1/ping");
    expect(sentHeaders().get("x-client-ip")).toBe("2001:db8::7");
  });

  it("sends neither header when the forwarded value is not an IP address", async () => {
    for (const value of ["evil.example, 1.2.3.4", "1.2.3.4 x-admin", "999.1.1.1", "unknown"]) {
      fetchMock.mockClear();
      await callBackendFor(new Headers({ "x-forwarded-for": value }), "/v1/ping");
      const headers = sentHeaders();
      expect(headers.get("x-client-ip")).toBeNull();
      expect(headers.get("x-forwarded-for")).toBeNull();
    }
  });

  it("omits the header when the visitor IP is unknown", async () => {
    await callBackendFor(new Headers(), "/v1/ping");
    expect(sentHeaders().get("x-client-ip")).toBeNull();

    fetchMock.mockClear();
    await callPublicBackend("/v1/plans", 300);
    expect(sentHeaders().get("x-client-ip")).toBeNull();
  });
});
