import { describe, expect, it } from "vitest";
import { buildCustomerCreate, buildCustomerUpdate, buildStatusChange, isStatusAction, readCustomerForm } from "./form";
import { formatIndianMobile, previewIndianMobile } from "./phone";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("previewIndianMobile", () => {
  it("normalises the usual ways staff type an Indian mobile to E.164", () => {
    for (const input of ["+91 98765 43210", "9876543210", "098765 43210", "919876543210", "+91-98765-43210", "(+91) 98765.43210"]) {
      expect(previewIndianMobile(input), input).toEqual({
        status: "valid",
        e164: "+919876543210",
        display: "+91 98765 43210",
      });
    }
  });

  it("treats the bare +91 prefix as empty", () => {
    expect(previewIndianMobile("+91 ")).toEqual({ status: "empty" });
    expect(previewIndianMobile("")).toEqual({ status: "empty" });
  });

  it("explains why a number is refused", () => {
    expect(previewIndianMobile("+44 7700 900123")).toMatchObject({ status: "invalid", message: expect.stringContaining("+91") });
    expect(previewIndianMobile("+91 12345 67890")).toMatchObject({ status: "invalid", message: expect.stringContaining("6, 7, 8 or 9") });
    expect(previewIndianMobile("98765")).toMatchObject({ status: "invalid" });
    expect(previewIndianMobile("98765abcde")).toMatchObject({ status: "invalid", message: expect.stringContaining("digits") });
  });

  it("formats stored numbers for display", () => {
    expect(formatIndianMobile("+919876543210")).toBe("+91 98765 43210");
    expect(formatIndianMobile("+14155550100")).toBe("+14155550100");
  });
});

describe("buildCustomerCreate", () => {
  it("sends the normalised phone with name and email", () => {
    expect(buildCustomerCreate(readCustomerForm(form({ phone: "98765 43210", name: " Asha Rao ", email: "ASHA@Example.com" })))).toEqual({
      ok: true,
      payload: { phone: "+919876543210", name: "Asha Rao", email: "asha@example.com" },
    });
    expect(buildCustomerCreate(readCustomerForm(form({ phone: "+919876543210", name: "Asha", email: "" })))).toEqual({
      ok: true,
      payload: { phone: "+919876543210", name: "Asha", email: null },
    });
  });

  it("reports every field problem at once", () => {
    const built = buildCustomerCreate(readCustomerForm(form({ phone: "+91", name: "A", email: "nope" })));
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors.phone).toEqual(["Enter the customer's mobile number"]);
    expect(built.errors.name).toEqual(["Enter the customer's name"]);
    expect(built.errors.email).toEqual(["Enter a valid email address"]);
  });
});

describe("buildCustomerUpdate", () => {
  it("only sends a phone when the field was submitted", () => {
    expect(buildCustomerUpdate(readCustomerForm(form({ name: "Asha Rao", email: "" })))).toEqual({
      ok: true,
      payload: { name: "Asha Rao", email: null },
    });
    expect(buildCustomerUpdate(readCustomerForm(form({ name: "Asha Rao", email: "", phone: "9876543210" })))).toEqual({
      ok: true,
      payload: { name: "Asha Rao", email: null, phone: "+919876543210" },
    });
  });

  it("refuses an invalid phone", () => {
    const built = buildCustomerUpdate(readCustomerForm(form({ name: "Asha Rao", email: "", phone: "12345" })));
    expect(built).toMatchObject({ ok: false, errors: { phone: [expect.any(String)] } });
  });
});

describe("buildStatusChange", () => {
  it("requires a reason for the audit trail", () => {
    expect(buildStatusChange("  Suspected fraud  ")).toEqual({ ok: true, payload: { reason: "Suspected fraud" } });
    expect(buildStatusChange("no")).toEqual({ ok: false, errors: { reason: ["Give a reason for the audit trail"] } });
    expect(buildStatusChange(undefined)).toMatchObject({ ok: false });
  });

  it("only knows block, unblock and close", () => {
    expect(["block", "unblock", "close"].every(isStatusAction)).toBe(true);
    expect(isStatusAction("delete")).toBe(false);
  });
});
