import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  anonymous,
  backendCalls,
  callBackend,
  cookieStore,
  expired,
  fail,
  ok,
  redirectTarget,
  resetHarness,
  signedInAs,
} from "@/test/routeHarness";

vi.mock("next/headers", async () => {
  const harness = await import("@/test/routeHarness");
  return { cookies: async () => harness.cookieStore, headers: async () => harness.incomingHeaders.current };
});

vi.mock("@/lib/backend/server", async () => {
  const harness = await import("@/test/routeHarness");
  return { callBackend: (...args: Parameters<typeof harness.callBackend>) => harness.callBackend(...args) };
});

const { changeCustomerStatus, createCustomer, postManualAdjustment, revokeCustomerSessions, updateCustomer } = await import("./actions");

const customerId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";
const key = "adj-0d4c7a2e-1b3f-4e5a-8c6d-9f0a1b2c3d4e";

const customer = {
  id: customerId,
  phone: "+919876543210",
  name: "Asha Rao",
  email: null,
  status: "active",
  kycStatus: "none",
  createdVia: "admin",
  createdAt: "2026-10-01T04:30:00.000Z",
  updatedAt: "2026-10-01T04:30:00.000Z",
};

const adjustmentResponse = (replayed: boolean) => ({
  adjustment: {
    transactionId: "t1",
    customerId,
    account: "wallet",
    direction: "credit",
    amountPaise: 250_050,
    reason: "Refund for failed payout",
    idempotencyKey: key,
    createdAt: "2026-10-12T04:30:00.000Z",
  },
  balancePaise: 250_050,
  replayed,
});

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

const adjustment = { direction: "credit", amount: "2,500.50", reason: "Refund for failed payout", idempotencyKey: key };

beforeEach(() => {
  resetHarness();
});

describe("customer server actions authorization", () => {
  it("refuses support for every write without calling the backend", async () => {
    signedInAs("support", () => ok({ customer }));
    const refused = { status: "error", code: "forbidden", message: "Your role does not allow this action" };
    await expect(createCustomer(form({ phone: "9876543210", name: "Asha" }))).resolves.toEqual(refused);
    await expect(updateCustomer(customerId, form({ name: "Asha" }))).resolves.toEqual(refused);
    await expect(changeCustomerStatus(customerId, "block", "Fraud check")).resolves.toEqual(refused);
    await expect(postManualAdjustment(customerId, adjustment)).resolves.toEqual(refused);
    await expect(revokeCustomerSessions(customerId)).resolves.toEqual(refused);
    expect(backendCalls()).toEqual([]);
  });

  it("keeps manual adjustments owner only", async () => {
    signedInAs("ops", () => ok(adjustmentResponse(false), 201));
    await expect(postManualAdjustment(customerId, adjustment)).resolves.toMatchObject({ status: "error", code: "forbidden" });
    expect(backendCalls()).toEqual([]);
  });

  it("only lets owners change a mobile number", async () => {
    signedInAs("ops", () => ok({ customer }));
    await expect(updateCustomer(customerId, form({ name: "Asha Rao", email: "", phone: "9876500000" }))).resolves.toMatchObject({
      status: "error",
      code: "forbidden",
      errors: { phone: [expect.stringContaining("owner")] },
    });
    expect(backendCalls()).toEqual([]);

    signedInAs("owner", () => ok({ customer: { ...customer, phone: "+919876500000" } }));
    await expect(updateCustomer(customerId, form({ name: "Asha Rao", email: "", phone: "98765 00000" }))).resolves.toMatchObject({
      status: "ok",
    });
    expect(backendCalls()).toEqual([
      [
        `/v1/admin/customers/${customerId}`,
        { method: "PATCH", token: "token-1", json: { name: "Asha Rao", email: null, phone: "+919876500000" } },
      ],
    ]);
  });

  it("redirects anonymous callers to login", async () => {
    anonymous();
    expect(await redirectTarget(changeCustomerStatus(customerId, "block", "Fraud check"))).toBe("/login");
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("clears the cookie when the session expired", async () => {
    expired();
    expect(await redirectTarget(postManualAdjustment(customerId, adjustment))).toBe("/login?expired=1");
    expect(cookieStore.set).toHaveBeenCalledWith(expect.stringContaining("nextera_admin_session"), "", expect.objectContaining({ maxAge: 0 }));
    expect(backendCalls()).toEqual([]);
  });

  it("sends staff with a pending password change to the password page", async () => {
    signedInAs("owner", () => ok({ customer }), { mustChangePassword: true });
    expect(await redirectTarget(createCustomer(form({ phone: "9876543210", name: "Asha" })))).toBe("/account/password");
    expect(backendCalls()).toEqual([]);
  });

  it("rejects malformed ids and actions before calling the backend", async () => {
    signedInAs("owner", () => ok({ customer }));
    await expect(changeCustomerStatus("../staff", "block", "Fraud check")).resolves.toMatchObject({ code: "not_found" });
    await expect(changeCustomerStatus(customerId, "delete" as "block", "Fraud check")).resolves.toMatchObject({
      code: "validation",
    });
    await expect(postManualAdjustment("x", adjustment)).resolves.toMatchObject({ code: "not_found" });
    expect(backendCalls()).toEqual([]);
  });
});

describe("createCustomer", () => {
  it("creates with the normalised phone", async () => {
    signedInAs("ops", () => ok({ customer }, 201));
    await expect(createCustomer(form({ phone: "+91 98765 43210", name: "Asha Rao", email: "" }))).resolves.toEqual({
      status: "ok",
      data: customer,
    });
    expect(backendCalls()).toEqual([
      ["/v1/admin/customers", { method: "POST", token: "token-1", json: { phone: "+919876543210", name: "Asha Rao", email: null } }],
    ]);
  });

  it("validates locally and maps the duplicate phone conflict", async () => {
    signedInAs("ops", () =>
      fail(409, "conflict", "A customer with this mobile number already exists", {
        phone: ["A customer with this mobile number already exists"],
      }),
    );
    await expect(createCustomer(form({ phone: "+44 7700 900123", name: "Asha" }))).resolves.toMatchObject({
      code: "validation",
      errors: { phone: [expect.stringContaining("+91")] },
    });
    expect(backendCalls()).toEqual([]);

    await expect(createCustomer(form({ phone: "9876543210", name: "Asha" }))).resolves.toEqual({
      status: "error",
      code: "conflict",
      message: "A customer with this mobile number already exists",
      errors: { phone: ["A customer with this mobile number already exists"] },
    });
  });
});

describe("changeCustomerStatus", () => {
  it("lets ops block with a reason", async () => {
    signedInAs("ops", () => ok({ customer: { ...customer, status: "blocked" } }));
    await expect(changeCustomerStatus(customerId, "block", "  Suspected fraud ")).resolves.toMatchObject({
      status: "ok",
      data: { status: "blocked" },
    });
    expect(backendCalls()).toEqual([
      [`/v1/admin/customers/${customerId}/block`, { method: "POST", token: "token-1", json: { reason: "Suspected fraud" } }],
    ]);
  });

  it("needs a reason", async () => {
    signedInAs("owner");
    await expect(changeCustomerStatus(customerId, "close", " ")).resolves.toMatchObject({
      code: "validation",
      errors: { reason: [expect.any(String)] },
    });
    expect(backendCalls()).toEqual([]);
  });

  it("returns the backend's closure blockers", async () => {
    signedInAs("owner", () =>
      fail(409, "conflict", "This customer cannot be closed: wallet holds ₹1,500", { closure: ["wallet holds ₹1,500"] }),
    );
    await expect(changeCustomerStatus(customerId, "close", "Customer asked to close")).resolves.toEqual({
      status: "error",
      code: "closure_blocked",
      message: "This customer cannot be closed yet:",
      errors: { closure: ["wallet holds ₹1,500"] },
    });
  });
});

describe("revokeCustomerSessions", () => {
  it("posts to the revoke-sessions endpoint for owner/ops", async () => {
    for (const role of ["owner", "ops"] as const) {
      resetHarness();
      signedInAs(role, () => ok(null, 204));
      await expect(revokeCustomerSessions(customerId)).resolves.toEqual({ status: "ok", data: null });
      expect(backendCalls()).toEqual([
        [`/v1/admin/customers/${customerId}/revoke-sessions`, { method: "POST", token: "token-1" }],
      ]);
    }
  });

  it("returns not_found for an invalid customer id", async () => {
    signedInAs("owner");
    await expect(revokeCustomerSessions("not-a-uuid")).resolves.toMatchObject({ code: "not_found" });
    expect(backendCalls()).toEqual([]);
  });

  it("maps backend errors through revokeSessionsFailure", async () => {
    signedInAs("ops", () => fail(404, "not_found", "Customer not found"));
    await expect(revokeCustomerSessions(customerId)).resolves.toMatchObject({ code: "not_found" });

    signedInAs("ops", () => fail(500, "internal", "Server error"));
    await expect(revokeCustomerSessions(customerId)).resolves.toMatchObject({ code: "internal" });
  });
});

describe("postManualAdjustment", () => {
  it("posts paise with the client idempotency key", async () => {
    signedInAs("owner", () => ok(adjustmentResponse(false), 201));
    await expect(postManualAdjustment(customerId, adjustment)).resolves.toEqual({ status: "ok", data: adjustmentResponse(false) });
    expect(backendCalls()).toEqual([
      [
        `/v1/admin/customers/${customerId}/adjustments`,
        {
          method: "POST",
          token: "token-1",
          json: { direction: "credit", account: "wallet", amountPaise: 250_050, reason: "Refund for failed payout", idempotencyKey: key },
        },
      ],
    ]);
  });

  it("sends the same key on a retry so the backend replays instead of posting twice", async () => {
    let posted = 0;
    signedInAs("owner", () => ok(adjustmentResponse(posted++ > 0), posted > 1 ? 200 : 201));
    const first = await postManualAdjustment(customerId, adjustment);
    const retry = await postManualAdjustment(customerId, adjustment);
    expect(first).toMatchObject({ status: "ok", data: { replayed: false } });
    expect(retry).toMatchObject({ status: "ok", data: { replayed: true } });
    const keys = backendCalls().map(([, init]) => (init?.json as { idempotencyKey: string }).idempotencyKey);
    expect(keys).toEqual([key, key]);
  });

  it("refuses amounts over one crore and short reasons locally", async () => {
    signedInAs("owner");
    await expect(postManualAdjustment(customerId, { ...adjustment, amount: "1,00,00,000.01" })).resolves.toMatchObject({
      code: "validation",
      errors: { amount: [expect.stringContaining("limited to")] },
    });
    await expect(postManualAdjustment(customerId, { ...adjustment, amount: "9".repeat(500) })).resolves.toMatchObject({
      code: "validation",
    });
    await expect(postManualAdjustment(customerId, { ...adjustment, reason: "oops" })).resolves.toMatchObject({
      errors: { reason: [expect.any(String)] },
    });
    await expect(postManualAdjustment(customerId, { ...adjustment, idempotencyKey: "" })).resolves.toMatchObject({
      code: "validation",
      message: expect.stringContaining("start the adjustment again"),
    });
    expect(backendCalls()).toEqual([]);
  });

  it("maps insufficient funds, closed customers and key conflicts", async () => {
    signedInAs("owner", () => fail(422, "insufficient_funds", "Insufficient balance for this operation"));
    await expect(postManualAdjustment(customerId, { ...adjustment, direction: "debit" })).resolves.toMatchObject({
      code: "insufficient_funds",
      errors: { amount: ["Debit is more than the wallet balance"] },
    });

    signedInAs("owner", () => fail(409, "customer_closed", "This customer account is closed"));
    await expect(postManualAdjustment(customerId, adjustment)).resolves.toMatchObject({ code: "customer_closed" });

    signedInAs("owner", () => fail(409, "conflict", "This idempotency key was already used for a different adjustment"));
    await expect(postManualAdjustment(customerId, adjustment)).resolves.toMatchObject({ code: "idempotency_conflict" });
  });

  it("follows the backend password_change_required code", async () => {
    signedInAs("owner", () => fail(403, "password_change_required", "Change it"));
    expect(await redirectTarget(postManualAdjustment(customerId, adjustment))).toBe("/account/password");
  });
});
