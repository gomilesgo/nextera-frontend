import { describe, expect, it } from "vitest";
import { firstName, toCustomerProfile } from "./customer";

const valid = {
  id: "c1",
  phone: "+919876543210",
  name: "  Asha Rao ",
  email: null,
  status: "active",
  kycStatus: "none",
};

describe("toCustomerProfile", () => {
  it("accepts the backend profile and tidies the name", () => {
    expect(toCustomerProfile(valid)).toEqual({ ...valid, name: "Asha Rao" });
  });

  it("treats blank names as missing", () => {
    expect(toCustomerProfile({ ...valid, name: "  " })?.name).toBeNull();
    expect(toCustomerProfile({ ...valid, name: undefined })?.name).toBeNull();
  });

  it("rejects malformed profiles", () => {
    expect(toCustomerProfile(null)).toBeNull();
    expect(toCustomerProfile({ ...valid, kycStatus: "maybe" })).toBeNull();
    expect(toCustomerProfile({ ...valid, status: "deleted" })).toBeNull();
    expect(toCustomerProfile({ ...valid, phone: 98 })).toBeNull();
    expect(toCustomerProfile({ ...valid, email: 1 })).toBeNull();
  });
});

describe("firstName", () => {
  it("returns the first word or null", () => {
    expect(firstName({ name: "Asha Rao" })).toBe("Asha");
    expect(firstName({ name: null })).toBeNull();
  });
});
