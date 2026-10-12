import { beforeEach, describe, expect, it, vi } from "vitest";

const callBackend = vi.fn();
let visitorIp = "203.0.113.50";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": visitorIp }),
}));

vi.mock("@/lib/backend/server", () => ({
  callBackend: (...args: unknown[]) => callBackend(...args),
}));

const { submitEnquiry } = await import("./actions");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = { name: "Asha Rao", phone: "9876543210" };

beforeEach(() => {
  visitorIp = "203.0.113.50";
  callBackend.mockReset();
  callBackend.mockResolvedValue({ ok: true, status: 201, data: { ref: "NXL-2610-0001" } });
});

describe("submitEnquiry", () => {
  it("does not spend rate-limit slots on invalid submissions", async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const state = await submitEnquiry({ status: "idle" }, form({ name: "", phone: "1" }));
      expect(state.kind).toBe("validation");
    }
    expect(callBackend).not.toHaveBeenCalled();

    for (let attempt = 0; attempt < 5; attempt++) {
      expect(await submitEnquiry({ status: "idle" }, form(valid))).toEqual({ status: "ok", ref: "NXL-2610-0001" });
    }
    const limited = await submitEnquiry({ status: "idle" }, form(valid));
    expect(limited.kind).toBe("rate_limited");
    expect(callBackend).toHaveBeenCalledTimes(5);
  });

  it("short-circuits the honeypot before validation or the backend", async () => {
    const state = await submitEnquiry({ status: "idle" }, form({ referral_note: "bot", name: "" }));
    expect(state).toEqual({ status: "ok" });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("shows the backend reference, including refs past 9999", async () => {
    visitorIp = "203.0.113.61";
    callBackend.mockResolvedValue({ ok: true, status: 201, data: { ref: "NXL-2610-10000" } });

    expect(await submitEnquiry({ status: "idle" }, form(valid))).toEqual({ status: "ok", ref: "NXL-2610-10000" });
    expect(callBackend).toHaveBeenCalledWith("/v1/leads", {
      method: "POST",
      json: { name: "Asha Rao", phone: "+919876543210", path: "/enquire" },
    });
  });

  it("maps the backend 429 to a friendly message with the wait", async () => {
    visitorIp = "203.0.113.62";
    callBackend.mockResolvedValue({
      ok: false,
      status: 429,
      error: { code: "rate_limited", message: "We already have your enquiry. Our team will call you shortly.", retryAfterSeconds: 20 * 3600 },
    });

    const state = await submitEnquiry({ status: "idle" }, form(valid));

    expect(state).toMatchObject({
      status: "error",
      kind: "rate_limited",
      message: "We have had a lot of enquiries recently. Please try again in about 20 hours, or email us at Contact@srahira.com.",
    });
    expect(state.values?.name).toBe("Asha Rao");
  });
});
