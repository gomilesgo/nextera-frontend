import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { AdminCustomerDetail, ManualAdjustmentResponse } from "@nextera/contracts";
import { parseAuditFilters } from "@/lib/audit/filters";
import { auditKeys } from "@/lib/queries/audit";
import { customerKeys } from "@/lib/queries/customers";
import {
  actionError,
  applyWalletBalance,
  rememberCreatedCustomer,
  syncAdjustment,
  syncAdjustmentFailure,
  syncCustomer,
} from "./cache";
import { parseCustomerFilters, parseLedgerFilters } from "./filters";
import { CustomerActionError } from "@/lib/actions/outcome";

const customerId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";
const otherId = "0d4c7a2e-1b3f-4e5a-8c6d-9f0a1b2c3d4e";

const customer = {
  id: customerId,
  phone: "+919876543210",
  name: "Asha Rao",
  email: null,
  status: "active" as const,
  kycStatus: "none" as const,
  createdVia: "admin" as const,
  createdAt: "2026-10-01T04:30:00.000Z",
  updatedAt: "2026-10-01T04:30:00.000Z",
};

const detail: AdminCustomerDetail = {
  customer,
  kyc: { status: "none", panMasked: null, panName: null, submittedAt: null, verifiedAt: null, rejectionReason: null },
  bankAccounts: [],
  balances: [
    { account: "principal:x", balancePaise: 500_000 },
    { account: "wallet", balancePaise: 100_000 },
  ],
  totalBalancePaise: 600_000,
};

function seeded() {
  const client = new QueryClient();
  const keys = {
    detail: customerKeys.detail(customerId),
    otherDetail: customerKeys.detail(otherId),
    list: customerKeys.list(parseCustomerFilters({})),
    ledger: customerKeys.ledger(customerId, parseLedgerFilters({})),
    otherLedger: customerKeys.ledger(otherId, parseLedgerFilters({})),
    audit: auditKeys.list(parseAuditFilters({})),
  };
  client.setQueryData(keys.detail, detail);
  client.setQueryData(keys.otherDetail, { ...detail, customer: { ...customer, id: otherId } });
  for (const key of [keys.list, keys.ledger, keys.otherLedger, keys.audit]) client.setQueryData(key, { items: [] });
  const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated ?? false;
  return { client, keys, stale };
}

describe("syncCustomer", () => {
  it("updates the detail and invalidates lists and the audit log", async () => {
    const { client, keys, stale } = seeded();
    await syncCustomer(client, { ...customer, status: "blocked" });
    expect(client.getQueryData<AdminCustomerDetail>(keys.detail)?.customer.status).toBe("blocked");
    expect(client.getQueryData<AdminCustomerDetail>(keys.detail)?.balances).toEqual(detail.balances);
    expect([stale(keys.detail), stale(keys.list), stale(keys.audit)]).toEqual([true, true, true]);
    expect([stale(keys.otherDetail), stale(keys.ledger)]).toEqual([false, false]);
  });
});

describe("rememberCreatedCustomer", () => {
  it("invalidates every list", async () => {
    const { client, keys, stale } = seeded();
    await rememberCreatedCustomer(client);
    expect([stale(keys.list), stale(keys.audit), stale(keys.detail)]).toEqual([true, true, false]);
  });
});

describe("syncAdjustment", () => {
  const result: ManualAdjustmentResponse = {
    adjustment: {
      transactionId: "t1",
      customerId,
      account: "wallet",
      direction: "credit",
      amountPaise: 50_000,
      reason: "Refund for failed payout",
      idempotencyKey: "adj-1234567890",
      createdAt: "2026-10-12T00:00:00.000Z",
    },
    balancePaise: 150_000,
    replayed: false,
  };

  it("shows the new wallet balance and invalidates this customer's balances and ledger", async () => {
    const { client, keys, stale } = seeded();
    await syncAdjustment(client, customerId, result);
    const updated = client.getQueryData<AdminCustomerDetail>(keys.detail);
    expect(updated?.balances).toEqual([
      { account: "principal:x", balancePaise: 500_000 },
      { account: "wallet", balancePaise: 150_000 },
    ]);
    expect(updated?.totalBalancePaise).toBe(650_000);
    expect([stale(keys.detail), stale(keys.ledger), stale(keys.audit)]).toEqual([true, true, true]);
    expect([stale(keys.otherDetail), stale(keys.otherLedger), stale(keys.list)]).toEqual([false, false, false]);
  });

  it("adds a wallet row for a first credit", () => {
    expect(applyWalletBalance({ ...detail, balances: [], totalBalancePaise: 0 }, 2_500)).toMatchObject({
      balances: [{ account: "wallet", balancePaise: 2_500 }],
      totalBalancePaise: 2_500,
    });
  });
});

describe("syncAdjustmentFailure", () => {
  it("refreshes the wallet figure after a refused adjustment", async () => {
    const { client, keys, stale } = seeded();
    await syncAdjustmentFailure(client, customerId, new CustomerActionError({ code: "insufficient_funds", message: "No" }));
    expect([stale(keys.detail), stale(keys.ledger), stale(keys.audit)]).toEqual([true, false, false]);
    expect(stale(keys.otherDetail)).toBe(false);
  });

  it("refreshes the balance, ledger and audit log when the post may have landed", async () => {
    for (const error of [
      new CustomerActionError({ code: "unavailable", message: "Down" }),
      new CustomerActionError({ code: "internal", message: "Boom" }),
      new TypeError("Failed to fetch"),
    ]) {
      const { client, keys, stale } = seeded();
      await syncAdjustmentFailure(client, customerId, error);
      expect([stale(keys.detail), stale(keys.ledger), stale(keys.audit)]).toEqual([true, true, true]);
      expect([stale(keys.otherDetail), stale(keys.otherLedger)]).toEqual([false, false]);
    }
  });

  it("leaves the cache alone for navigation errors", async () => {
    const { client, keys, stale } = seeded();
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    await syncAdjustmentFailure(client, customerId, redirect);
    expect(stale(keys.detail)).toBe(false);
  });
});

describe("actionError", () => {
  it("ignores navigation, keeps typed errors and wraps transport failures", () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    expect(actionError(redirect)).toBeNull();
    expect(actionError(null)).toBeNull();
    const typed = new CustomerActionError({ code: "conflict", message: "Taken" });
    expect(actionError(typed)).toBe(typed);
    expect(actionError(new TypeError("Failed to fetch"))).toMatchObject({ code: "unavailable" });
  });
});
