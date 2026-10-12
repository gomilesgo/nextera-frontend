import { beforeEach, describe, expect, it, vi } from "vitest";
import { withdrawal, withdrawalId } from "@/test/withdrawals";
import { callBackend, fail, ok, resetStaffMocks, signedInAs } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { payWithdrawal, retryWithdrawal, markWithdrawalFailed } = await import("./actions");

beforeEach(resetStaffMocks);

describe("payWithdrawal", () => {
  it("pays without override", async () => {
    signedInAs("ops", () => ok({ withdrawal: { ...withdrawal, status: "processing" } }));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("ok");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls[0]?.[0]).toBe(`/v1/admin/withdrawals/${withdrawalId}/pay`);
  });

  it("blocks non-owner from using overrideBlocked", async () => {
    signedInAs("ops");
    const result = await payWithdrawal(withdrawalId, true, "customer is a suspect");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("forbidden");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls).toHaveLength(0);
  });

  it("allows owner to use overrideBlocked with reason", async () => {
    signedInAs("owner", () => ok({ withdrawal: { ...withdrawal, status: "processing" } }));
    const result = await payWithdrawal(withdrawalId, true, "verified with compliance team");
    expect(result.status).toBe("ok");
  });

  it("returns unknown-outcome message on unavailable", async () => {
    signedInAs("ops", () => fail("unavailable", "down", 503));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toContain("may already have been");
  });

  it("passes payout_on_hold conflict through", async () => {
    signedInAs("ops", () => fail("payout_on_hold", "Customer is blocked", 409));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("payout_on_hold");
  });

  it("returns payout_settled with refresh message when already settled", async () => {
    signedInAs("ops", () => fail("payout_settled", "Payout already settled", 409));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.code).toBe("payout_settled");
      expect(result.message).toContain("already settled by Cashfree");
    }
  });

  it("returns customer_closed when customer account is closed", async () => {
    signedInAs("ops", () => fail("customer_closed", "This customer account is closed", 409));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.code).toBe("customer_closed");
      expect(result.message).toBe("This customer account is closed");
    }
  });

  it("returns kyc_not_verified when KYC is no longer verified", async () => {
    signedInAs("ops", () => fail("kyc_not_verified", "This customer's KYC is no longer verified", 409));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.code).toBe("kyc_not_verified");
    }
  });

  it("returns provider_unavailable when Cashfree cannot be reached", async () => {
    signedInAs("ops", () => fail("provider_unavailable", "Cashfree unavailable", 503));
    const result = await payWithdrawal(withdrawalId, false);
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("provider_unavailable");
  });
});

describe("retryWithdrawal", () => {
  it("retries a failed withdrawal", async () => {
    signedInAs("ops", () => ok({ withdrawal: { ...withdrawal, status: "processing" } }));
    const result = await retryWithdrawal(withdrawalId, false);
    expect(result.status).toBe("ok");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls[0]?.[0]).toBe(`/v1/admin/withdrawals/${withdrawalId}/retry`);
  });
});

describe("markWithdrawalFailed", () => {
  it("requires owner role", async () => {
    signedInAs("ops");
    const result = await markWithdrawalFailed(withdrawalId, "confirmed not processed");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("forbidden");
  });

  it("validates reason length", async () => {
    signedInAs("owner");
    const result = await markWithdrawalFailed(withdrawalId, "too short");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("validation");
  });

  it("calls mark-failed endpoint with long reason", async () => {
    signedInAs("owner", () => ok({ withdrawal: { ...withdrawal, status: "failed" } }));
    const result = await markWithdrawalFailed(withdrawalId, "Cashfree confirmed never processed");
    expect(result.status).toBe("ok");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls[0]?.[0]).toBe(`/v1/admin/withdrawals/${withdrawalId}/mark-failed`);
  });

  it("returns unknown-outcome on internal error", async () => {
    signedInAs("owner", () => fail("internal", "err", 500));
    const result = await markWithdrawalFailed(withdrawalId, "long enough reason here");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toContain("may already have been");
  });
});
