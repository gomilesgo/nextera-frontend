import { describe, expect, it } from "vitest";
import { toAdminStaff } from "./staff";

const base = { id: "s1", email: "a@srahira.com", name: "Asha", role: "ops" };

describe("toAdminStaff", () => {
  it("treats a missing mustChangePassword as false", () => {
    expect(toAdminStaff(base)).toEqual({ ...base, mustChangePassword: false });
  });

  it("keeps mustChangePassword only when it is exactly true", () => {
    expect(toAdminStaff({ ...base, mustChangePassword: true })?.mustChangePassword).toBe(true);
    expect(toAdminStaff({ ...base, mustChangePassword: "yes" })?.mustChangePassword).toBe(false);
  });

  it("rejects malformed profiles and unknown roles", () => {
    expect(toAdminStaff(null)).toBeNull();
    expect(toAdminStaff({ ...base, role: "admin" })).toBeNull();
    expect(toAdminStaff({ ...base, id: 1 })).toBeNull();
  });
});
