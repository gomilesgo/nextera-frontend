import { describe, expect, it, vi } from "vitest";
import { createBackendClient } from "./client";
import type { BackendBinary } from "./client";

function setup(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  const client = createBackendClient({ baseUrl: "https://api.example.test", serviceKey: "portal-key", fetch: fetchMock });
  return { client, fetchMock };
}

function sentInit(fetchMock: ReturnType<typeof setup>["fetchMock"]) {
  const [, init] = fetchMock.mock.calls[0] ?? [];
  return { init: init as RequestInit, headers: new Headers(init?.headers) };
}

describe("createBackendClient form bodies", () => {
  it("sends FormData as is and lets fetch set the multipart boundary", async () => {
    const { client, fetchMock } = setup(Response.json({ ticket: {} }, { status: 201 }));
    const form = new FormData();
    form.set("subject", "Payout delayed");
    form.set("attachment", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "proof.pdf", { type: "application/pdf" }));

    const result = await client.request("/v1/support/tickets", { method: "POST", form, token: "tok" });

    expect(result.ok).toBe(true);
    const { init, headers } = sentInit(fetchMock);
    expect(init.body).toBe(form);
    expect(headers.get("content-type")).toBeNull();
    expect(headers.get("authorization")).toBe("Bearer tok");
  });

  it("prefers JSON bodies when no form is given", async () => {
    const { client, fetchMock } = setup(Response.json({}));

    await client.request("/v1/support/tickets/x/close", { method: "POST", json: {} });

    const { init, headers } = sentInit(fetchMock);
    expect(init.body).toBe("{}");
    expect(headers.get("content-type")).toBe("application/json");
  });
});

describe("createBackendClient binary reads", () => {
  it("buffers successful binary bodies inside the timeout", async () => {
    const upstream = new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } });
    const { client } = setup(upstream);

    const result = await client.request<BackendBinary>("/v1/support/tickets/a/messages/b/attachment", { binary: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.data.headers.get("content-type")).toBe("image/png");
    expect(upstream.bodyUsed).toBe(true);
  });

  it("reports a timeout instead of a truncated file when the body stalls", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      const signal = init?.signal as AbortSignal;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
          signal.addEventListener("abort", () => controller.error(signal.reason));
        },
      });
      return new Response(body, { status: 200, headers: { "content-type": "application/pdf" } });
    });
    const client = createBackendClient({
      baseUrl: "https://api.example.test",
      serviceKey: "portal-key",
      fetch: fetchMock,
      timeoutMs: 30,
    });

    const result = await client.request<BackendBinary>("/v1/support/tickets/a/messages/b/attachment", { binary: true });

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: { code: "unavailable", message: "The server took too long to respond. Please try again." },
    });
  });

  it("still parses the error envelope when a binary request fails", async () => {
    const { client } = setup(Response.json({ error: { code: "not_found", message: "Attachment not found" } }, { status: 404 }));

    const result = await client.request<BackendBinary>("/v1/support/tickets/a/messages/b/attachment", { binary: true });

    expect(result).toEqual({ ok: false, status: 404, error: { code: "not_found", message: "Attachment not found" } });
  });
});
