import { describe, expect, it } from "vitest";
import type { Plan } from "@nextera/contracts";
import { makeQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import { redirect } from "next/navigation";
import { PlanActionError, errorMessage, forgetPlan, isNavigationError, runAction, syncPlan, unwrapPlan } from "./cache";

const plan: Plan = {
  id: "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11",
  slug: "gold",
  name: "Gold",
  description: "",
  rateBps: 1200,
  tenureMonths: 12,
  minPaise: 100,
  maxPaise: 1000,
  status: "active",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
};

describe("unwrapPlan", () => {
  it("returns the plan or throws the field errors", () => {
    expect(unwrapPlan({ status: "ok", plan })).toBe(plan);
    expect(() => unwrapPlan({ status: "error", message: "Bad", errors: { slug: ["Taken"] } })).toThrow(
      PlanActionError,
    );
    try {
      unwrapPlan({ status: "error", message: "Bad", errors: { slug: ["Taken"] } });
    } catch (error) {
      expect((error as PlanActionError).errors).toEqual({ slug: ["Taken"] });
    }
  });
});

describe("syncPlan", () => {
  it("writes the detail and invalidates every plan query", async () => {
    const client = makeQueryClient();
    const other = "0b8f7c55-1d7e-4a8a-8f3e-2c1c4a6f9e01";
    client.setQueryData(queryKeys.plans.list(), { plans: [] });
    client.setQueryData(queryKeys.plans.detail(other), { plan: { ...plan, id: other } });
    client.setQueryData(queryKeys.session.me(), { staff: null });
    await syncPlan(client, plan);
    expect(client.getQueryData(queryKeys.plans.detail(plan.id))).toEqual({ plan });
    expect(client.getQueryState(queryKeys.plans.list())?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.plans.detail(plan.id))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.plans.detail(other))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.session.me())?.isInvalidated).toBe(false);
  });
});

describe("forgetPlan", () => {
  it("drops the detail and invalidates the list", async () => {
    const client = makeQueryClient();
    client.setQueryData(queryKeys.plans.list(), { plans: [plan] });
    client.setQueryData(queryKeys.plans.detail(plan.id), { plan });
    await forgetPlan(client, plan.id);
    expect(client.getQueryData(queryKeys.plans.detail(plan.id))).toBeUndefined();
    expect(client.getQueryState(queryKeys.plans.list())?.isInvalidated).toBe(true);
  });
});

function captureRedirect(): unknown {
  try {
    redirect("/account/password");
  } catch (error) {
    return error;
  }
  throw new Error("redirect did not throw");
}

describe("navigation errors", () => {
  it("detects Next redirects and leaves ordinary errors alone", () => {
    expect(isNavigationError(captureRedirect())).toBe(true);
    expect(isNavigationError(new PlanActionError("x"))).toBe(false);
    expect(isNavigationError(new TypeError("Failed to fetch"))).toBe(false);
  });

  it("rethrows redirects from actions and never shows them as failures", async () => {
    const redirectError = captureRedirect();
    await expect(runAction(() => Promise.reject(redirectError))).rejects.toBe(redirectError);
    await expect(runAction(async () => 42)).resolves.toBe(42);
    expect(errorMessage(redirectError)).toBeNull();
  });
});

describe("errorMessage", () => {
  it("shows action messages and hides transport errors", () => {
    expect(errorMessage(null)).toBeNull();
    expect(errorMessage(new PlanActionError("Only drafts can be deleted"))).toBe("Only drafts can be deleted");
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe(
      "Could not reach the console server. Please try again.",
    );
  });
});
