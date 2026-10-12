import { describe, expect, it, vi } from "vitest";
import { createBackendClient, parseErrorBody } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setup(response: Response | (() => Promise<Response>), timeoutMs?: number) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    typeof response === "function" ? response() : response,
  );
  const client = createBackendClient({
    baseUrl: "https://api.example.test/",
    serviceKey: "admin-key",
    fetch: fetchMock,
    timeoutMs,
  });
  return { client, fetchMock };
}

function sentInit(fetchMock: ReturnType<typeof setup>["fetchMock"]) {
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  return { url, init: init as RequestInit, headers: new Headers(init?.headers) };
}

describe("createBackendClient", () => {
  it("sends the service key, bearer, client ip and user agent without caching", async () => {
    const { client, fetchMock } = setup(jsonResponse({ staff: { id: "s1" } }));

    const result = await client.request<{ staff: { id: string } }>("/v1/staff/auth/me", {
      token: "tok",
      ip: "203.0.113.9",
      userAgent: "Mozilla/5.0",
    });

    expect(result).toEqual({ ok: true, status: 200, data: { staff: { id: "s1" } } });
    const { url, init, headers } = sentInit(fetchMock);
    expect(url).toBe("https://api.example.test/v1/staff/auth/me");
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.body).toBeUndefined();
    expect(headers.get("x-service-key")).toBe("admin-key");
    expect(headers.get("authorization")).toBe("Bearer tok");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.9");
    expect(headers.get("x-client-ip")).toBe("203.0.113.9");
    expect(headers.get("x-client-user-agent")).toBe("Mozilla/5.0");
    expect(headers.get("content-type")).toBeNull();
  });

  it("omits optional headers when they are not provided", async () => {
    const { client, fetchMock } = setup(jsonResponse({ ok: true }));

    await client.request("/v1/plans");

    const { headers } = sentInit(fetchMock);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(headers.get("x-client-ip")).toBeNull();
    expect(headers.get("x-client-user-agent")).toBeNull();
  });

  it("sends the staff member's ip as x-client-ip for the backend behind Railway's edge", async () => {
    const { client, fetchMock } = setup(jsonResponse({ ok: true }));

    await client.request("/v1/admin/customers", { token: "tok", ip: "2001:db8::7" });

    const { headers } = sentInit(fetchMock);
    expect(headers.get("x-client-ip")).toBe("2001:db8::7");
    expect(headers.get("x-forwarded-for")).toBe("2001:db8::7");
  });

  it("serialises JSON bodies", async () => {
    const { client, fetchMock } = setup(jsonResponse({ plan: { id: "p1" } }, 201));

    const result = await client.request("/v1/admin/plans", {
      method: "POST",
      json: { name: "Gold" },
    });

    expect(result).toEqual({ ok: true, status: 201, data: { plan: { id: "p1" } } });
    const { init, headers } = sentInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Gold" }));
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("truncates long user agents", async () => {
    const { client, fetchMock } = setup(jsonResponse({}));

    await client.request("/v1/ping", { userAgent: "x".repeat(900) });

    expect(sentInit(fetchMock).headers.get("x-client-user-agent")).toHaveLength(512);
  });

  it("returns undefined data for empty success responses", async () => {
    const { client } = setup(new Response(null, { status: 204 }));

    const result = await client.request("/v1/admin/plans/x", { method: "DELETE" });

    expect(result).toEqual({ ok: true, status: 204, data: undefined });
  });

  it("returns the error envelope with fields and retry hints", async () => {
    const { client } = setup(
      jsonResponse(
        {
          error: {
            code: "validation",
            message: "Some fields are invalid",
            fields: { maxPaise: ["Maximum must be at least the minimum"] },
            retryAfterSeconds: 30,
          },
        },
        400,
      ),
    );

    const result = await client.request("/v1/admin/plans", { method: "POST", json: {} });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: {
        code: "validation",
        message: "Some fields are invalid",
        fields: { maxPaise: ["Maximum must be at least the minimum"] },
        retryAfterSeconds: 30,
      },
    });
  });

  it("maps non-envelope failures to internal or unavailable", async () => {
    const internal = await setup(new Response("<html>oops</html>", { status: 500 })).client.request("/x");
    const gateway = await setup(new Response("Bad gateway", { status: 502 })).client.request("/x");

    expect(internal).toMatchObject({ ok: false, status: 500, error: { code: "internal" } });
    expect(gateway).toMatchObject({ ok: false, status: 502, error: { code: "unavailable" } });
  });

  it("reports network failures as unavailable", async () => {
    const { client } = setup(() => Promise.reject(new TypeError("fetch failed")));

    const result = await client.request("/v1/staff/auth/me");

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: { code: "unavailable", message: "Could not reach the server. Please try again." },
    });
  });

  it("aborts slow requests after the timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const client = createBackendClient({
      baseUrl: "https://api.example.test",
      serviceKey: "k",
      fetch: fetchMock,
      timeoutMs: 20,
    });

    const result = await client.request("/v1/staff/auth/me");

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "unavailable",
        message: "The server took too long to respond. Please try again.",
      },
    });
  });
});

describe("parseErrorBody", () => {
  it("recognises the password_change_required code", () => {
    expect(parseErrorBody({ error: { code: "password_change_required", message: "Change it" } }, 403)).toEqual({
      code: "password_change_required",
      message: "Change it",
    });
  });

  it("falls back to internal for unknown codes and drops malformed fields", () => {
    expect(
      parseErrorBody({ error: { code: "weird", message: 42, fields: { a: ["x", 1], b: "no" } } }, 400),
    ).toEqual({ code: "internal", message: "Something went wrong", fields: { a: ["x"] } });
  });
});
