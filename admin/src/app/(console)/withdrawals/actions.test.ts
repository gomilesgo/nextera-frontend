import { beforeEach, describe, expect, it, vi } from "vitest";
import { withdrawal, withdrawalId } from "@/test/withdrawals";
import { callBackend, fail, ok, resetStaffMocks, signedInAs } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { approveWithdrawal, rejectWithdrawal, bulkApproveWithdrawals, bulkRejectWithdrawals, resolveWithdrawalReview } = await import("./actions");

beforeEach(resetStaffMocks);

describe("approveWithdrawal", () => {
  it("approves successfully and returns updated withdrawal", async () => {
    signedInAs("ops", () => ok({ withdrawal: { ...withdrawal, status: "approved" } }));
    const result = await approveWithdrawal(withdrawalId);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.data.status).toBe("approved");
    expect(callBackend.mock.calls.find(([p]) => p !== "/v1/staff/auth/me")?.[0]).toBe(
      `/v1/admin/withdrawals/${withdrawalId}/approve`,
    );
  });

  it("returns forbidden for support", async () => {
    signedInAs("support");
    const result = await approveWithdrawal(withdrawalId);
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("forbidden");
  });

  it("returns not_found for non-uuid id", async () => {
    signedInAs("ops");
    const result = await approveWithdrawal("bad-id");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("not_found");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls).toHaveLength(0);
  });

  it("returns unknown-outcome message on unavailable", async () => {
    signedInAs("ops", () => fail("unavailable", "down", 503));
    const result = await approveWithdrawal(withdrawalId);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.code).toBe("unavailable");
      expect(result.message).toContain("may already have been");
    }
  });

  it("returns unknown-outcome message on internal error", async () => {
    signedInAs("ops", () => fail("internal", "oops", 500));
    const result = await approveWithdrawal(withdrawalId);
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toContain("may already have been");
  });

  it("returns customer_closed when customer account is closed", async () => {
    signedInAs("ops", () => fail("customer_closed", "This customer account is closed", 409));
    const result = await approveWithdrawal(withdrawalId);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.code).toBe("customer_closed");
      expect(result.message).toBe("This customer account is closed");
    }
  });
});

describe("rejectWithdrawal", () => {
  it("rejects with a reason", async () => {
    signedInAs("owner", () => ok({ withdrawal: { ...withdrawal, status: "rejected", rejectReason: "Too risky" } }));
    const result = await rejectWithdrawal(withdrawalId, "Too risky");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.data.status).toBe("rejected");
  });

  it("validates the reason length", async () => {
    signedInAs("ops");
    const result = await rejectWithdrawal(withdrawalId, "abc");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("validation");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls).toHaveLength(0);
  });
});

describe("bulkApproveWithdrawals", () => {
  it("calls bulk approve endpoint with ids", async () => {
    signedInAs("ops", () => ok({ results: [{ id: withdrawalId, ok: true, withdrawal }], succeeded: 1, failed: 0 }));
    const result = await bulkApproveWithdrawals([withdrawalId]);
    expect(result.status).toBe("ok");
  });

  it("returns validation error for empty ids", async () => {
    signedInAs("ops");
    const result = await bulkApproveWithdrawals([]);
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("validation");
  });
});

describe("bulkRejectWithdrawals", () => {
  it("calls bulk reject with ids and reason", async () => {
    signedInAs("ops", () => ok({ results: [], succeeded: 0, failed: 1 }));
    const result = await bulkRejectWithdrawals([withdrawalId], "Regulatory hold");
    expect(result.status).toBe("ok");
  });

  it("validates reason before calling backend", async () => {
    signedInAs("ops");
    const result = await bulkRejectWithdrawals([withdrawalId], "no");
    expect(result.status).toBe("error");
    const backendCalls = callBackend.mock.calls.filter(([p]) => p !== "/v1/staff/auth/me");
    expect(backendCalls).toHaveLength(0);
  });
});

describe("resolveWithdrawalReview", () => {
  it("resolves review with a note", async () => {
    signedInAs("owner", () => ok({ withdrawal: { ...withdrawal, needsReview: false } }));
    const result = await resolveWithdrawalReview(withdrawalId, "Checked and confirmed OK");
    expect(result.status).toBe("ok");
  });

  it("validates note length", async () => {
    signedInAs("ops");
    const result = await resolveWithdrawalReview(withdrawalId, "no");
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.code).toBe("validation");
  });
});
