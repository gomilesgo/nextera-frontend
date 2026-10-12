import { beforeEach, describe, expect, it, vi } from "vitest";
import { assigneeId, customerProfile, lead, leadId, planId } from "@/test/desk";
import { anonymous, callBackend, expired, fail, ok, redirectTarget, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { convertLead, createLead, updateLead } = await import("./actions");

function leadForm(values: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

beforeEach(resetStaffMocks);

describe("createLead", () => {
  it("lets support create a lead with rupees converted to paise", async () => {
    signedInAs("support", () => ok({ lead: { ...lead, source: "admin" } }, 201));

    const result = await createLead(
      leadForm({
        name: " Ravi Kumar ",
        phone: "98765 43210",
        email: "RAVI@Example.com",
        interest: "",
        planId,
        amount: "5,00,000",
        message: "",
        notes: "Walk-in",
        assigneeId,
      }),
    );
    expect(result).toMatchObject({ status: "ok", data: { id: leadId } });
    expect(writes()).toEqual([
      [
        "/v1/admin/leads",
        {
          method: "POST",
          token: "token-1",
          json: {
            name: "Ravi Kumar",
            phone: "98765 43210",
            email: "ravi@example.com",
            planId,
            amountPaise: 50_000_000,
            notes: "Walk-in",
            assigneeId,
          },
        },
      ],
    ]);
  });

  it("validates before calling the backend", async () => {
    signedInAs("owner");

    const result = await createLead(leadForm({ name: "R", phone: "12", email: "nope", amount: "-5", planId: "x" }));
    expect(result).toMatchObject({
      status: "error",
      code: "validation",
      errors: {
        name: [expect.any(String)],
        phone: [expect.any(String)],
        email: [expect.any(String)],
        amount: [expect.any(String)],
        planId: ["Choose a plan from the list"],
      },
    });
    await expect(createLead(leadForm({ name: "Ravi", phone: "9876543210", amount: "9".repeat(20) }))).resolves.toMatchObject({
      errors: { amount: ["Amount is too large"] },
    });
    expect(writes()).toEqual([]);
  });

  it("maps backend field errors onto the form", async () => {
    signedInAs("ops", () =>
      fail("validation", "Invalid", 400, { phone: ["Enter a valid Indian mobile number"], amountPaise: ["Too big"] }),
    );

    await expect(createLead(leadForm({ name: "Ravi", phone: "12345678" }))).resolves.toMatchObject({
      status: "error",
      errors: { phone: ["Enter a valid Indian mobile number"], amount: ["Too big"] },
    });
  });
});

describe("updateLead", () => {
  it("patches status, notes and assignee", async () => {
    signedInAs("support", () => ok({ lead: { ...lead, status: "contacted" } }));

    await expect(updateLead(leadId, { status: "contacted" })).resolves.toMatchObject({ status: "ok" });
    await updateLead(leadId, { notes: "   " });
    await updateLead(leadId, { assigneeId: null });
    expect(writes().map(([path, init]) => [path, init?.json])).toEqual([
      [`/v1/admin/leads/${leadId}`, { status: "contacted" }],
      [`/v1/admin/leads/${leadId}`, { notes: null }],
      [`/v1/admin/leads/${leadId}`, { assigneeId: null }],
    ]);
  });

  it("refuses the converted status, unknown assignees, smuggled keys and empty patches", async () => {
    signedInAs("owner", () => ok({ lead }));

    await expect(updateLead(leadId, { status: "converted" })).resolves.toMatchObject({ status: "error", code: "validation" });
    await expect(updateLead(leadId, { assigneeId: "bob" })).resolves.toMatchObject({ status: "error", code: "validation" });
    await expect(updateLead(leadId, {})).resolves.toMatchObject({ status: "error", code: "validation" });
    await expect(updateLead(leadId, { notes: "x".repeat(4001) })).resolves.toMatchObject({ status: "error" });
    await expect(updateLead("../staff", { status: "lost" })).resolves.toEqual({
      status: "error",
      code: "not_found",
      message: "Lead not found",
    });
    await updateLead(leadId, { status: "lost", convertedCustomerId: "x" } as never);
    expect(writes().map(([, init]) => init?.json)).toEqual([{ status: "lost" }]);
  });

  it("passes the converted-status conflict through", async () => {
    signedInAs("ops", () => fail("conflict", "A converted lead keeps its status", 409));

    await expect(updateLead(leadId, { status: "lost" })).resolves.toEqual({
      status: "error",
      code: "conflict",
      message: "A converted lead keeps its status",
    });
  });
});

describe("convertLead", () => {
  it("returns the customer and whether it was created", async () => {
    const converted = { lead: { ...lead, status: "converted", convertedCustomerId: customerProfile.id }, customer: customerProfile, created: false };
    signedInAs("support", () => ok(converted));

    await expect(convertLead(leadId)).resolves.toEqual({ status: "ok", data: converted });
    expect(writes()).toEqual([[`/v1/admin/leads/${leadId}/convert`, { method: "POST", token: "token-1" }]]);
  });

  it("surfaces customer_inactive and malformed results", async () => {
    signedInAs("ops", () => fail("customer_inactive", "The customer with this phone is blocked.", 409));
    await expect(convertLead(leadId)).resolves.toEqual({
      status: "error",
      code: "customer_inactive",
      message: "The customer with this phone is blocked.",
    });

    signedInAs("ops", () => ok({ lead }));
    await expect(convertLead(leadId)).resolves.toMatchObject({ status: "error", code: "internal" });
  });

  it("rejects malformed ids before calling the backend", async () => {
    signedInAs("owner");
    await expect(convertLead("1; drop")).resolves.toMatchObject({ code: "not_found" });
    expect(writes()).toEqual([]);
  });
});

describe("lead action sessions", () => {
  it("redirects anonymous, expired and pending-password sessions", async () => {
    anonymous();
    expect(await redirectTarget(convertLead(leadId))).toBe("/login");
    expect(callBackend).not.toHaveBeenCalled();

    expired();
    expect(await redirectTarget(updateLead(leadId, { status: "lost" }))).toBe("/login?expired=1");

    signedInAs("support", undefined, { mustChangePassword: true });
    expect(await redirectTarget(createLead(leadForm({ name: "Ravi", phone: "9876543210" })))).toBe("/account/password");
    expect(writes()).toEqual([]);

    signedInAs("support", () => fail("password_change_required", "Change your password", 403));
    expect(await redirectTarget(convertLead(leadId))).toBe("/account/password");
  });
});
