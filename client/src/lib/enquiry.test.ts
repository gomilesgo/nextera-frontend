import { describe, expect, it, vi } from "vitest";
import type { LeadCreatedResponse } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { backendLimitMessage, emptyEnquiry, readEnquiry, submitLead, validateEnquiry } from "./enquiry";

const valid = {
  ...emptyEnquiry,
  name: "Asha Rao",
  phone: "98765 43210",
  email: "Asha@Example.in",
  interest: "Fixed-return plans",
  message: "Please call me about the 12-month plan.",
};

describe("readEnquiry", () => {
  it("reads and trims every known field and ignores the rest", () => {
    const data = new FormData();
    data.set("name", "  Asha ");
    data.set("phone", "9876543210");
    data.set("isAdmin", "true");
    expect(readEnquiry(data)).toEqual({ ...emptyEnquiry, name: "Asha", phone: "9876543210" });
  });
});

describe("validateEnquiry", () => {
  it("builds the lead payload with a normalised phone and lowercased email", () => {
    expect(validateEnquiry(valid)).toEqual({
      ok: true,
      lead: {
        name: "Asha Rao",
        phone: "+919876543210",
        email: "asha@example.in",
        interest: "Fixed-return plans",
        message: "Please call me about the 12-month plan.",
        path: "/enquire",
      },
    });
  });

  it("omits optional fields left blank", () => {
    const result = validateEnquiry({ ...emptyEnquiry, name: "Asha", phone: "9876543210" });
    expect(result).toEqual({ ok: true, lead: { name: "Asha", phone: "+919876543210", path: "/enquire" } });
  });

  it("reports one message per invalid field", () => {
    const result = validateEnquiry({
      name: "",
      phone: "12345",
      email: "nope",
      interest: "Crypto",
      message: "x".repeat(2001),
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Enter your name",
        phone: "Enter a 10-digit Indian mobile number",
        email: "Enter a valid email",
        interest: "Choose one of the options",
        message: "Keep your message under 2,000 characters",
      },
    });
  });
});

function post(result: BackendResult<LeadCreatedResponse>) {
  return vi.fn(async () => result);
}

const lead = { name: "Asha", phone: "+919876543210", path: "/enquire" };

describe("submitLead", () => {
  it("posts the lead and returns the reference", async () => {
    const send = post({ ok: true, status: 201, data: { ref: "NXL-2610-0007" } });
    expect(await submitLead(lead, send)).toEqual({ status: "ok", ref: "NXL-2610-0007" });
    expect(await submitLead(lead, post({ ok: true, status: 201, data: { ref: "NXL-2610-10000" } }))).toEqual({
      status: "ok",
      ref: "NXL-2610-10000",
    });
    expect(send).toHaveBeenCalledWith("/v1/leads", lead);
  });

  it("does not report success without a reference", async () => {
    expect(await submitLead(lead, post({ ok: true, status: 201, data: {} as LeadCreatedResponse }))).toEqual({
      status: "unavailable",
      reason: "missing_ref",
    });
  });

  it("maps backend field errors onto the form", async () => {
    const result = await submitLead(
      lead,
      post({
        ok: false,
        status: 400,
        error: { code: "validation", message: "Some fields are invalid", fields: { phone: ["Enter a valid mobile"], path: ["x"] } },
      }),
    );
    expect(result).toEqual({ status: "invalid", errors: { phone: "Enter a valid mobile" } });
  });

  it("passes rate limits through and treats everything else as unavailable", async () => {
    expect(
      await submitLead(lead, post({ ok: false, status: 429, error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 60 } })),
    ).toEqual({ status: "rate_limited", retryAfterSeconds: 60 });
    expect(
      await submitLead(lead, post({ ok: false, status: 429, error: { code: "internal", message: "Too Many Requests" } })),
    ).toEqual({ status: "rate_limited" });
    expect(await submitLead(lead, post({ ok: false, status: 404, error: { code: "not_found", message: "Not found" } }))).toEqual({
      status: "unavailable",
      reason: "404:not_found",
    });
    expect(
      await submitLead(lead, post({ ok: false, status: 503, error: { code: "unavailable", message: "Could not reach the server." } })),
    ).toEqual({ status: "unavailable", reason: "503:unavailable" });
  });
});

describe("backendLimitMessage", () => {
  it("stays neutral about whose enquiries hit the limit", () => {
    expect(backendLimitMessage(90 * 60)).toBe(
      "We have had a lot of enquiries recently. Please try again in about 2 hours, or email us at Contact@srahira.com.",
    );
    expect(backendLimitMessage(undefined)).toBe(
      "We have had a lot of enquiries recently. Please try again later, or email us at Contact@srahira.com.",
    );
    expect(backendLimitMessage(60)).not.toMatch(/already have|your enquiry/i);
  });
});
