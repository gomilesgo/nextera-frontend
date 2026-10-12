import { describe, expect, it, vi } from "vitest";
import { createBackendClient } from "./client";
import type { BackendBinary } from "./client";

function clientFor(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  return createBackendClient({ baseUrl: "https://api.example.test", serviceKey: "portal-key", fetch: fetchMock });
}

function chunked(chunks: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const size of chunks) controller.enqueue(new Uint8Array(size).fill(37));
      controller.close();
    },
  });
}

describe("createBackendClient byte limits", () => {
  it("returns the whole body when it fits the limit", async () => {
    const client = clientFor(new Response(chunked([4, 4]), { status: 200, headers: { "content-type": "application/pdf" } }));

    const result = await client.request<BackendBinary>("/v1/documents/x/file", { binary: true, maxBytes: 8 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.bytes.byteLength).toBe(8);
  });

  it("refuses a body that grows past the limit without a content-length", async () => {
    const body = chunked([6, 6]);
    const client = clientFor(new Response(body, { status: 200, headers: { "content-type": "application/pdf" } }));

    const result = await client.request<BackendBinary>("/v1/documents/x/file", { binary: true, maxBytes: 8 });

    expect(result).toMatchObject({ ok: false, status: 502, error: { code: "internal" } });
  });

  it("refuses a declared content-length over the limit before reading", async () => {
    const client = clientFor(
      new Response(chunked([2]), { status: 200, headers: { "content-type": "application/pdf", "content-length": "100" } }),
    );

    const result = await client.request<BackendBinary>("/v1/documents/x/file", { binary: true, maxBytes: 8 });

    expect(result.ok).toBe(false);
  });
});
