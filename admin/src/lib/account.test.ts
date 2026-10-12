import { describe, expect, it } from "vitest";
import { parsePasswordChange } from "./account";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parsePasswordChange", () => {
  it("returns only the backend fields when valid", () => {
    expect(
      parsePasswordChange(
        form({
          currentPassword: "old-password-123",
          newPassword: "a-much-longer-secret",
          confirmPassword: "a-much-longer-secret",
        }),
      ),
    ).toEqual({
      ok: true,
      request: { currentPassword: "old-password-123", newPassword: "a-much-longer-secret" },
    });
  });

  it("requires at least 12 characters and a matching confirmation", () => {
    const result = parsePasswordChange(
      form({ currentPassword: "old", newPassword: "short", confirmPassword: "other" }),
    );
    expect(result).toEqual({
      ok: false,
      fields: {
        newPassword: ["Use at least 12 characters"],
        confirmPassword: ["The passwords do not match"],
      },
    });
    const mismatch = parsePasswordChange(
      form({ currentPassword: "old", newPassword: "long-enough-pass", confirmPassword: "long-enough-pas" }),
    );
    expect(mismatch).toEqual({ ok: false, fields: { confirmPassword: ["The passwords do not match"] } });
  });

  it("rejects reusing the current password and a missing current password", () => {
    expect(
      parsePasswordChange(
        form({ currentPassword: "same-password-1", newPassword: "same-password-1", confirmPassword: "same-password-1" }),
      ),
    ).toEqual({ ok: false, fields: { newPassword: ["Choose a password different from the current one"] } });
    const missing = parsePasswordChange(
      form({ currentPassword: "", newPassword: "long-enough-pass", confirmPassword: "long-enough-pass" }),
    );
    expect(missing.ok === false && missing.fields.currentPassword).toEqual(["Enter your current password"]);
  });
});
