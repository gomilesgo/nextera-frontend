import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackendRequest, BackendResult } from "@/lib/backend/client";

const cookieStore = { get: vi.fn(), set: vi.fn() };
const callBackend = vi.fn<(path: string, init?: BackendRequest) => Promise<BackendResult<unknown>>>();

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => new Headers(),
}));

vi.mock("@/lib/backend/server", () => ({
  callBackend: (path: string, init?: BackendRequest) => callBackend(path, init),
}));

const { changePlanStatus, createPlan, deletePlan, updatePlan } = await import("./actions");

const planId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";
const plan = {
  id: planId,
  slug: "gold-12",
  name: "Gold 12",
  description: "",
  rateBps: 1250,
  tenureMonths: 12,
  minPaise: 1_000_000,
  maxPaise: 50_000_000,
  status: "draft",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function signedInAs(role: string, extra: Record<string, unknown> = {}) {
  cookieStore.get.mockReturnValue({ value: "token-1" });
  callBackend.mockImplementation(async (path) => {
    if (path === "/v1/staff/auth/me") {
      return { ok: true, status: 200, data: { staff: { id: "s1", email: "a@srahira.com", name: "A", role, ...extra } } };
    }
    return { ok: true, status: 200, data: { plan } };
  });
}

function planForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    slug: "gold-12",
    name: "Gold 12",
    description: "",
    rate: "12.5",
    tenureMonths: "12",
    min: "10000",
    max: "500000",
    status: "draft",
  })) {
    data.set(key, value);
  }
  return data;
}

function writes() {
  return callBackend.mock.calls.filter(([path]) => path !== "/v1/staff/auth/me");
}

async function redirectTarget(promise: Promise<unknown>): Promise<string> {
  const error = (await promise.then(
    () => {
      throw new Error("expected a redirect");
    },
    (caught: unknown) => caught,
  )) as { digest?: string };
  return String(error.digest).split(";")[2] ?? "";
}

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  callBackend.mockReset();
});

describe("plan server actions", () => {
  it("refuses support staff without calling the backend write", async () => {
    signedInAs("support");

    await expect(createPlan(planForm())).resolves.toEqual({
      status: "error",
      message: "Your role does not allow this action",
    });
    await expect(updatePlan(planId, planForm())).resolves.toMatchObject({ status: "error" });
    await expect(changePlanStatus(planId, "active")).resolves.toMatchObject({ status: "error" });
    await expect(deletePlan(planId)).resolves.toMatchObject({ status: "error" });
    expect(writes()).toEqual([]);
  });

  it("lets ops create plans with converted money and the bearer token", async () => {
    signedInAs("ops");

    await expect(createPlan(planForm())).resolves.toEqual({ status: "ok", plan });

    expect(writes()).toEqual([
      [
        "/v1/admin/plans",
        {
          method: "POST",
          token: "token-1",
          json: {
            slug: "gold-12",
            name: "Gold 12",
            description: "",
            status: "draft",
            rateBps: 1250,
            tenureMonths: 12,
            minPaise: 1_000_000,
            maxPaise: 50_000_000,
          },
        },
      ],
    ]);
  });

  it("redirects anonymous callers to login", async () => {
    cookieStore.get.mockReturnValue(undefined);

    expect(await redirectTarget(createPlan(planForm()))).toBe("/login");
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("clears the cookie and redirects when the session has expired", async () => {
    cookieStore.get.mockReturnValue({ value: "stale" });
    callBackend.mockResolvedValue({ ok: false, status: 401, error: { code: "unauthorized", message: "expired" } });

    expect(await redirectTarget(deletePlan(planId))).toBe("/login?expired=1");
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.stringContaining("nextera_admin_session"),
      "",
      expect.objectContaining({ maxAge: 0, httpOnly: true, sameSite: "strict", path: "/" }),
    );
    expect(writes()).toEqual([]);
  });

  it("sends staff with a pending password change to the password page", async () => {
    signedInAs("owner", { mustChangePassword: true });

    expect(await redirectTarget(changePlanStatus(planId, "archived"))).toBe("/account/password");
    expect(writes()).toEqual([]);
  });

  it("follows the backend password_change_required code", async () => {
    signedInAs("owner");
    callBackend.mockImplementation(async (path) =>
      path === "/v1/staff/auth/me"
        ? { ok: true, status: 200, data: { staff: { id: "s1", email: "a@x.com", name: "A", role: "owner" } } }
        : { ok: false, status: 403, error: { code: "password_change_required", message: "Change it" } },
    );

    expect(await redirectTarget(createPlan(planForm()))).toBe("/account/password");
  });

  it("rejects malformed ids and smuggled statuses before calling the backend", async () => {
    signedInAs("owner");

    await expect(deletePlan("../staff")).resolves.toEqual({ status: "error", message: "Plan not found" });
    await expect(changePlanStatus(planId, "draft" as "active")).resolves.toEqual({
      status: "error",
      message: "Unsupported status",
    });
    expect(writes()).toEqual([]);
  });

  it("maps backend field errors back to the form", async () => {
    signedInAs("ops");
    callBackend.mockImplementation(async (path) =>
      path === "/v1/staff/auth/me"
        ? { ok: true, status: 200, data: { staff: { id: "s1", email: "a@x.com", name: "A", role: "ops" } } }
        : {
            ok: false,
            status: 409,
            error: { code: "conflict", message: "A plan with this slug already exists" },
          },
    );

    await expect(createPlan(planForm())).resolves.toEqual({
      status: "error",
      message: "A plan with this slug already exists",
      errors: { slug: ["A plan with this slug already exists"] },
    });
  });
});
