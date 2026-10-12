import { beforeEach, describe, expect, it, vi } from "vitest";

const callBackend = vi.fn();
const readSessionToken = vi.fn();
const clearSession = vi.fn();

vi.mock("@/lib/backend/server", () => ({
  callBackend: (...args: unknown[]) => callBackend(...args),
}));

vi.mock("@/lib/session", () => ({
  readSessionToken: () => readSessionToken(),
  clearSession: () => clearSession(),
}));

const { submitKycAction } = await import("./actions");

const valid = {
  pan: "abcde1234f",
  panName: "Asha Rao",
  dob: "1990-05-17",
  line1: "12 Lake View Road",
  line2: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500034",
  consent: "yes",
};

const saved = {
  kycStatus: "submitted",
  profile: {
    panMasked: "XXXXXX234F",
    panName: "Asha Rao",
    dob: "1990-05-17",
    address: { line1: "12 Lake View Road", line2: "", city: "Hyderabad", state: "Telangana", pincode: "500034" },
    submittedAt: "2026-10-12T05:00:00.000Z",
    verifiedAt: null,
    rejectionReason: null,
  },
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  callBackend.mockReset();
  clearSession.mockReset();
  readSessionToken.mockReset();
  readSessionToken.mockResolvedValue("tok");
  callBackend.mockResolvedValue({ ok: true, status: 200, data: saved });
});

describe("submitKycAction", () => {
  it("validates before calling the backend", async () => {
    const result = await submitKycAction(form({ ...valid, pan: "ABC", consent: "" }));

    expect(result).toMatchObject({ status: "error", code: "validation", fields: { pan: [expect.any(String)], consent: [expect.any(String)] } });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("refuses oversized values without calling the backend", async () => {
    const result = await submitKycAction(form({ ...valid, panName: "A".repeat(5000), line1: "x".repeat(500) }));

    expect(result).toMatchObject({ status: "error", fields: { panName: [expect.any(String)], line1: [expect.any(String)] } });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("refuses minors without calling the backend", async () => {
    const result = await submitKycAction(form({ ...valid, dob: "2020-01-01" }));

    expect(result).toMatchObject({ status: "error", fields: { dob: [expect.stringMatching(/18/)] } });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("sends the normalised payload with the consent version and returns a masked, projected profile", async () => {
    const result = await submitKycAction(form(valid));

    expect(callBackend).toHaveBeenCalledWith("/v1/kyc", {
      method: "PUT",
      token: "tok",
      json: {
        pan: "ABCDE1234F",
        panName: "Asha Rao",
        dob: "1990-05-17",
        address: { line1: "12 Lake View Road", line2: "", city: "Hyderabad", state: "Telangana", pincode: "500034" },
        consentVersion: "kyc-2026-10",
      },
    });
    expect(result).toEqual({ status: "ok", kyc: { kycStatus: "submitted", profile: { ...saved.profile, dob: null, address: null } } });
    expect(JSON.stringify(result)).not.toContain("ABCDE1234F");
    expect(JSON.stringify(result)).not.toContain("Lake View");
  });

  it("reports a signed-out visitor without calling the backend", async () => {
    readSessionToken.mockResolvedValue(null);

    const result = await submitKycAction(form(valid));

    expect(result).toMatchObject({ status: "error", httpStatus: 401, code: "unauthorized" });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("clears the cookie when the backend expires the session", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path === "/v1/ping"
        ? { ok: true, status: 200, data: {} }
        : { ok: false, status: 401, error: { code: "unauthorized", message: "Session expired" } },
    );

    const result = await submitKycAction(form(valid));

    expect(result).toMatchObject({ status: "error", httpStatus: 401, code: "unauthorized" });
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the service key is rejected", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    callBackend.mockResolvedValue({ ok: false, status: 401, error: { code: "unauthorized", message: "Missing or invalid service key" } });

    const result = await submitKycAction(form(valid));

    expect(result).toMatchObject({ status: "error", httpStatus: 503, code: "unavailable" });
    expect(clearSession).not.toHaveBeenCalled();
    errorLog.mockRestore();
  });

  it("puts a duplicate PAN on the PAN field", async () => {
    callBackend.mockResolvedValue({
      ok: false,
      status: 409,
      error: { code: "conflict", message: "This PAN is already registered", fields: { pan: ["This PAN is already registered"] } },
    });

    const result = await submitKycAction(form(valid));

    expect(result).toMatchObject({ status: "error", code: "conflict", fields: { pan: [expect.stringMatching(/already registered/)] } });
  });

  it("maps backend field paths and replaces unsafe wording", async () => {
    callBackend.mockResolvedValueOnce({
      ok: false,
      status: 400,
      error: { code: "validation", message: "Some fields are invalid", fields: { "address.pincode": ["Enter a valid 6-digit PIN code"] } },
    });
    expect(await submitKycAction(form(valid))).toMatchObject({ fields: { pincode: ["Enter a valid 6-digit PIN code"] } });

    callBackend.mockResolvedValueOnce({ ok: false, status: 409, error: { code: "conflict", message: "row locked by tx 42" } });
    const locked = await submitKycAction(form(valid));
    expect(locked).toMatchObject({ status: "error", httpStatus: 409 });
    expect(locked.status === "error" && locked.message).not.toMatch(/tx 42/);

    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    callBackend.mockResolvedValueOnce({ ok: false, status: 500, error: { code: "internal", message: "pg exploded" } });
    const internal = await submitKycAction(form(valid));
    expect(internal.status === "error" && internal.message).toBe("Something went wrong on our side. Please try again.");
    errorLog.mockRestore();
  });

  it("never returns a full PAN even if the backend leaks one", async () => {
    callBackend.mockResolvedValue({ ok: true, status: 200, data: { ...saved, profile: { ...saved.profile, panMasked: "ABCDE1234F" } } });

    const result = await submitKycAction(form(valid));

    expect(JSON.stringify(result)).not.toContain("ABCDE1234F");
  });

  it("refuses a malformed backend response", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    callBackend.mockResolvedValue({ ok: true, status: 200, data: { kycStatus: "submitted", profile: { panMasked: "ABCDE" } } });

    expect(await submitKycAction(form(valid))).toMatchObject({ status: "error", httpStatus: 502 });
    errorLog.mockRestore();
  });
});
