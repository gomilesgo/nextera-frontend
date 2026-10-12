import { createServer } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createBackendClient, encodeForm } from "./client";

type Received = { headers: IncomingHttpHeaders; body: Buffer };

const received: Received[] = [];
const server = createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    received.push({ headers: request.headers, body: Buffer.concat(chunks) });
    response.writeHead(201, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
  });
});
let baseUrl = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function sampleForm() {
  const form = new FormData();
  form.set("body", "Please see the receipt.\nThanks");
  form.set("internal", "false");
  form.set("attachment", new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], { type: "application/pdf" }), "receipt.pdf");
  return form;
}

describe("multipart requests", () => {
  it("encodes FormData with its boundary and exact byte length", async () => {
    const encoded = await encodeForm(sampleForm());
    expect(encoded.contentType).toMatch(/^multipart\/form-data; boundary=/);
    const text = new TextDecoder().decode(encoded.bytes);
    expect(text).toContain('name="body"');
    expect(text).toContain('name="attachment"; filename="receipt.pdf"');
    expect(text).toContain("Content-Type: application/pdf");
  });

  it("sends a buffered body with the multipart content type", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }, { status: 201 }));
    const client = createBackendClient({ baseUrl: "https://api.example.test", serviceKey: "admin-key", fetch: fetchMock });

    await client.request("/v1/admin/support/tickets/t/messages", { method: "POST", form: sampleForm(), token: "tok" });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBeInstanceOf(ArrayBuffer);
    expect(new Headers(init.headers).get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
  });

  it("reaches a real server with Content-Length and no chunked encoding", async () => {
    received.length = 0;
    const client = createBackendClient({ baseUrl, serviceKey: "admin-key" });

    const result = await client.request("/upload", { method: "POST", form: sampleForm(), token: "tok" });

    expect(result).toEqual({ ok: true, status: 201, data: { ok: true } });
    const [request] = received;
    expect(request?.headers["transfer-encoding"]).toBeUndefined();
    expect(request?.headers["content-length"]).toBe(String(request?.body.byteLength));
    expect(request?.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    expect(request?.headers.authorization).toBe("Bearer tok");
    expect(request?.body.toString("latin1")).toContain('filename="receipt.pdf"');
  });
});
