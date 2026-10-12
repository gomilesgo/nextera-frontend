import { beforeEach, describe, expect, it, vi } from "vitest";
import { TICKET_ID, message, summary } from "@/lib/support/fixtures.test-utils";

const callBackend = vi.fn();
const redirect = vi.fn((location: string) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { location });
});

vi.mock("@/lib/backend/server", () => ({
  callBackend: (...args: unknown[]) => callBackend(...args),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nextera-path": "/portal/support?status=open" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => redirect(location),
}));

const { loadTicket, loadTickets } = await import("./supportLoaders");

const expired = { ok: false, status: 401, error: { code: "unauthorized", message: "Session expired" } };

beforeEach(() => {
  callBackend.mockReset();
  redirect.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("support loaders", () => {
  it("load validated lists and threads", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path.startsWith("/v1/support/tickets?")
        ? { ok: true, status: 200, data: { items: [summary], nextCursor: null } }
        : { ok: true, status: 200, data: { ticket: summary, messages: [message] } },
    );

    expect(await loadTickets("tok", "open", null)).toEqual({ items: [summary], nextCursor: null });
    expect(callBackend).toHaveBeenCalledWith("/v1/support/tickets?status=open&limit=20", { token: "tok" });
    expect(await loadTicket("tok", TICKET_ID)).toEqual({ ticket: summary, messages: [message] });
  });

  it("return null for missing or malformed ticket ids", async () => {
    callBackend.mockResolvedValue({ ok: false, status: 404, error: { code: "not_found", message: "Ticket not found" } });

    expect(await loadTicket("tok", TICKET_ID)).toBeNull();
    expect(await loadTicket("tok", "not-a-uuid")).toBeNull();
    expect(callBackend).toHaveBeenCalledTimes(1);
  });

  it("send an expired session to login with the current path", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path === "/v1/ping" ? { ok: true, status: 200, data: {} } : expired,
    );

    await expect(loadTickets("tok", null, null)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/portal/login?expired=1&next=%2Fportal%2Fsupport%3Fstatus%3Dopen");
    await expect(loadTicket("tok", TICKET_ID)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("send a blocked account to login without a return path", async () => {
    callBackend.mockResolvedValue({ ok: false, status: 403, error: { code: "account_blocked", message: "Blocked" } });

    await expect(loadTicket("tok", TICKET_ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/portal/login?expired=blocked");
  });

  it("do not sign customers out when the service key is rejected", async () => {
    callBackend.mockResolvedValue(expired);

    await expect(loadTickets("tok", null, null)).rejects.toThrow(/unavailable/);
    expect(redirect).not.toHaveBeenCalled();
  });
});
