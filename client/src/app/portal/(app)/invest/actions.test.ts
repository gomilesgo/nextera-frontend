import { beforeEach, describe, expect, it, vi } from "vitest";

const callBackend = vi.fn();
const getPortalPlan = vi.fn();
const readSessionToken = vi.fn();
const clearSession = vi.fn();

vi.mock("@/lib/backend/server", () => ({
  callBackend: (...args: unknown[]) => callBackend(...args),
}));

vi.mock("@/lib/backend/plans", () => ({
  getPortalPlan: (...args: unknown[]) => getPortalPlan(...args),
}));

vi.mock("@/lib/session", () => ({
  readSessionToken: () => readSessionToken(),
  clearSession: () => clearSession(),
}));

const { createInvestmentAction, startPaymentAction, verifyConsentAction } = await import("./actions");

const ID = "6f1c2a0e-3b4d-4c5e-8f90-123456789abc";

beforeEach(() => {
  callBackend.mockReset();
  getPortalPlan.mockReset();
  readSessionToken.mockReset();
  clearSession.mockReset();
  readSessionToken.mockResolvedValue("tok");
  getPortalPlan.mockResolvedValue({
    status: "ok",
    plan: { id: "p1", slug: "steady-12", name: "Steady 12", description: "", rateBps: 800, tenureMonths: 12, minPaise: 10_000_000, maxPaise: 500_000_000, status: "active", createdAt: "", updatedAt: "" },
  });
});

describe("invest server actions", () => {
  it("refuse to run without a session and clear the cookie", async () => {
    readSessionToken.mockResolvedValue(null);
    expect(await createInvestmentAction({ planSlug: "steady-12", amount: "1,00,000" })).toMatchObject({ code: "signed_out" });
    expect(clearSession).toHaveBeenCalled();
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("validate the amount against plan limits before posting", async () => {
    expect(await createInvestmentAction({ planSlug: "steady-12", amount: "10" })).toMatchObject({ code: "validation", field: "amount" });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("send the session token with the write", async () => {
    callBackend.mockResolvedValue({ ok: false, status: 409, error: { code: "bank_account_required", message: "x" } });
    expect(await createInvestmentAction({ planSlug: "steady-12", amount: "1,00,000" })).toMatchObject({ code: "bank" });
    expect(callBackend).toHaveBeenCalledWith("/v1/investments", {
      method: "POST",
      json: { planSlug: "steady-12", amountPaise: 10_000_000 },
      token: "tok",
    });
  });

  it("validate the OTP code format before calling the backend", async () => {
    expect(await verifyConsentAction({ investmentId: ID, challengeId: ID, code: "12" })).toMatchObject({ field: "code" });
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("clear the session when the backend reports it expired", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path === "/v1/ping"
        ? { ok: true, status: 200, data: {} }
        : { ok: false, status: 401, error: { code: "unauthorized", message: "expired" } },
    );
    expect(await startPaymentAction({ investmentId: ID })).toMatchObject({ code: "signed_out" });
    expect(clearSession).toHaveBeenCalled();
  });
});
