import { beforeEach, describe, expect, it, vi } from "vitest";
import { credentials, member, memberId } from "@/test/fixtures";
import { anonymous, callBackend, fail, ok, redirectTarget, resetStaffMocks, signedInAs, writes } from "@/test/staff";

vi.mock("next/headers", async () => (await import("@/test/staff")).nextHeadersMock);
vi.mock("@/lib/backend/server", async () => (await import("@/test/staff")).backendServerMock);

const { changeStaffRole, inviteStaff, resetStaffCredentials, setStaffDisabled } = await import("./actions");

function inviteForm(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ email: " New@Srahira.com ", name: "New Person", role: "support", ...values })) {
    data.set(key, value);
  }
  return data;
}

beforeEach(resetStaffMocks);

describe("staff server actions", () => {
  it("are owner only", async () => {
    for (const role of ["ops", "support"] as const) {
      signedInAs(role);
      await expect(inviteStaff(inviteForm())).resolves.toMatchObject({ status: "error", code: "forbidden" });
      await expect(changeStaffRole(memberId, "ops")).resolves.toMatchObject({ status: "error", code: "forbidden" });
      await expect(setStaffDisabled(memberId, true)).resolves.toMatchObject({ status: "error", code: "forbidden" });
      await expect(resetStaffCredentials(memberId)).resolves.toMatchObject({ status: "error", code: "forbidden" });
      expect(writes()).toEqual([]);
    }
  });

  it("invites with a normalised payload and returns the credentials with a QR matrix", async () => {
    signedInAs("owner", () => ok(credentials, 201));

    const result = await inviteStaff(inviteForm());
    expect(result).toMatchObject({ status: "ok", data: { ...credentials, qr: { size: expect.any(Number) } } });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.qr.path).toMatch(/^M0 0h7/);
    expect(writes()).toEqual([
      [
        "/v1/admin/staff",
        { method: "POST", token: "token-1", json: { email: "new@srahira.com", name: "New Person", role: "support" } },
      ],
    ]);
  });

  it("validates the invite form before calling the backend", async () => {
    signedInAs("owner");

    const result = await inviteStaff(inviteForm({ email: "nope", name: "", role: "boss" }));
    expect(result).toMatchObject({
      status: "error",
      code: "validation",
      errors: { email: ["Enter a valid email address"], name: [expect.any(String)], role: ["Choose a role"] },
    });
    expect(writes()).toEqual([]);
  });

  it("maps a duplicate email to the email field", async () => {
    const message = "A staff member with this email already exists";
    signedInAs("owner", () => fail("conflict", message, 409, { email: [message] }));

    await expect(inviteStaff(inviteForm())).resolves.toEqual({
      status: "error",
      code: "conflict",
      message,
      errors: { email: [message] },
    });
  });

  it("refuses credentials that do not look like a real TOTP setup", async () => {
    signedInAs("owner", () => ok({ ...credentials, otpauthUrl: "https://evil.test/" }, 201));

    await expect(inviteStaff(inviteForm())).resolves.toMatchObject({ status: "error", code: "internal" });
  });

  it("changes a role and surfaces the last owner protection", async () => {
    signedInAs("owner", (path, init) =>
      path === `/v1/admin/staff/${memberId}` && init?.method === "PATCH" ? ok({ staff: { ...member, role: "ops" } }) : undefined,
    );
    await expect(changeStaffRole(memberId, "ops")).resolves.toEqual({ status: "ok", data: { ...member, role: "ops" } });
    expect(writes()).toEqual([[`/v1/admin/staff/${memberId}`, { method: "PATCH", token: "token-1", json: { role: "ops" } }]]);

    signedInAs("owner", () => fail("conflict", "At least one active owner must remain", 409));
    await expect(changeStaffRole(memberId, "support")).resolves.toEqual({
      status: "error",
      code: "conflict",
      message: "At least one active owner must remain",
    });
  });

  it("rejects smuggled roles, flags and ids", async () => {
    signedInAs("owner");

    await expect(changeStaffRole(memberId, "root" as "ops")).resolves.toMatchObject({ code: "validation" });
    await expect(setStaffDisabled(memberId, "yes" as unknown as boolean)).resolves.toMatchObject({ code: "validation" });
    await expect(resetStaffCredentials("../settings")).resolves.toMatchObject({ code: "not_found" });
    expect(writes()).toEqual([]);
  });

  it("disables and enables through the matching endpoints", async () => {
    signedInAs("owner", () => ok({ staff: member }));

    await setStaffDisabled(memberId, true);
    await setStaffDisabled(memberId, false);
    expect(writes().map(([path]) => path)).toEqual([
      `/v1/admin/staff/${memberId}/disable`,
      `/v1/admin/staff/${memberId}/enable`,
    ]);
  });

  it("resets credentials and passes the owner refusal through", async () => {
    signedInAs("owner", () => ok(credentials));
    await expect(resetStaffCredentials(memberId)).resolves.toMatchObject({ status: "ok", data: credentials });
    expect(writes()).toEqual([[`/v1/admin/staff/${memberId}/reset-credentials`, { method: "POST", token: "token-1" }]]);

    signedInAs("owner", () => fail("forbidden", "Owner credentials can only be reset from the command line", 403));
    await expect(resetStaffCredentials(memberId)).resolves.toEqual({
      status: "error",
      code: "forbidden",
      message: "Owner credentials can only be reset from the command line",
    });
  });

  it("redirects anonymous callers", async () => {
    anonymous();
    expect(await redirectTarget(inviteStaff(inviteForm()))).toBe("/login");
    expect(callBackend).not.toHaveBeenCalled();
  });
});
