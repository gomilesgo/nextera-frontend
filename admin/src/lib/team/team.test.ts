import { describe, expect, it, vi } from "vitest";
import { MutationObserver } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import { credentials, member } from "@/test/fixtures";
import { ONE_TIME_GC_MS, syncStaffMember } from "./cache";
import { buildInvite, parseRole, readInviteForm } from "./form";
import { clearClipboard, groupSecret, memberActions, memberState } from "./labels";
import { qrMatrix } from "./qr";
import { isStaffCredentials, isStaffMember } from "./shape";

const ownerId = "0e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f60";

describe("qrMatrix", () => {
  it("encodes the otpauth url as a square module path with finder patterns", () => {
    const qr = qrMatrix(credentials.otpauthUrl);
    expect(qr.size).toBeGreaterThanOrEqual(21);
    expect((qr.size - 17) % 4).toBe(0);
    expect(qr.path).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
    expect(qr.path.startsWith("M0 0h7v1h-7z")).toBe(true);
    expect(qr.path).toContain(`M${qr.size - 7} 0h7v1h-7z`);
    expect(qrMatrix(credentials.otpauthUrl)).toEqual(qr);
    expect(qrMatrix(`${credentials.otpauthUrl}x`).path).not.toBe(qr.path);
  });
});

describe("invite form", () => {
  it("reads and normalises the fields through the contracts schema", () => {
    const data = new FormData();
    data.set("email", " Ops@Srahira.COM ");
    data.set("name", " Priya ");
    data.set("role", "ops");
    expect(buildInvite(readInviteForm(data))).toEqual({
      ok: true,
      payload: { email: "ops@srahira.com", name: "Priya", role: "ops" },
    });
  });

  it("reports every invalid field", () => {
    expect(buildInvite(readInviteForm(new FormData()))).toEqual({
      ok: false,
      errors: {
        email: ["Enter a valid email address"],
        name: ["Enter the staff member's name"],
        role: ["Choose a role"],
      },
    });
  });

  it("only accepts known roles", () => {
    expect(parseRole("owner")).toBe("owner");
    expect(parseRole("admin")).toBeNull();
    expect(parseRole(undefined)).toBeNull();
  });
});

describe("clearClipboard", () => {
  it("overwrites the clipboard and swallows failures", async () => {
    const writeText = vi.fn(async () => undefined);
    clearClipboard({ writeText });
    expect(writeText).toHaveBeenCalledWith("");

    const rejecting = vi.fn(() => Promise.reject(new Error("denied")));
    expect(() => clearClipboard({ writeText: rejecting })).not.toThrow();
    await Promise.resolve();
    const throwing = vi.fn(() => {
      throw new Error("no clipboard");
    });
    expect(() => clearClipboard({ writeText: throwing })).not.toThrow();
    expect(() => clearClipboard(undefined)).not.toThrow();
  });
});

describe("staff labels", () => {
  it("groups the setup key for reading", () => {
    expect(groupSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(groupSecret("ABCDEF==")).toBe("ABCD EF");
  });

  it("derives a member's state", () => {
    const now = new Date("2026-10-12T10:00:00.000Z");
    expect(memberState({ ...member, mustChangePassword: false }, now)).toBe("active");
    expect(memberState(member, now)).toBe("pending");
    expect(memberState({ ...member, lockedUntil: "2026-10-12T10:05:00.000Z" }, now)).toBe("locked");
    expect(memberState({ ...member, lockedUntil: "2026-10-12T09:55:00.000Z", mustChangePassword: false }, now)).toBe("active");
    expect(memberState({ ...member, disabledAt: "2026-10-01T00:00:00.000Z" }, now)).toBe("disabled");
  });

  it("never offers self changes or owner resets", () => {
    expect(memberActions({ ...member, id: ownerId, role: "owner" }, ownerId)).toEqual({
      self: true,
      changeRole: false,
      toggleAccess: false,
      resetCredentials: false,
      ownerReset: false,
    });
    expect(memberActions({ ...member, role: "owner" }, ownerId)).toMatchObject({ resetCredentials: false, ownerReset: true });
    expect(memberActions(member, ownerId)).toMatchObject({ changeRole: true, toggleAccess: true, resetCredentials: true });
  });
});

describe("staff shapes", () => {
  it("accepts backend members and credentials and rejects lookalikes", () => {
    expect(isStaffMember(member)).toBe(true);
    expect(isStaffMember({ ...member, id: "s1" })).toBe(false);
    expect(isStaffCredentials(credentials)).toBe(true);
    expect(isStaffCredentials({ ...credentials, totpSecret: "not base32!" })).toBe(false);
    expect(isStaffCredentials({ ...credentials, temporaryPassword: "" })).toBe(false);
  });
});

describe("syncStaffMember", () => {
  it("writes the member into the list and invalidates staff queries only", async () => {
    const client = makeQueryClient();
    client.setQueryData(queryKeys.staff.list(), { staff: [member] });
    client.setQueryData(queryKeys.settings.current(), { settings: {} });

    await syncStaffMember(client, { ...member, role: "ops" });

    expect(client.getQueryData(queryKeys.staff.list())).toEqual({ staff: [{ ...member, role: "ops" }] });
    expect(client.getQueryState(queryKeys.staff.list())?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.settings.current())?.isInvalidated).toBe(false);
  });

  it("adds an invited member without storing their secrets", async () => {
    const client = makeQueryClient();
    client.setQueryData(queryKeys.staff.list(), { staff: [] });

    await syncStaffMember(client, credentials.staff);

    const cached = JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data));
    expect(cached).toContain(credentials.staff.email);
    expect(cached).not.toContain(credentials.temporaryPassword);
    expect(cached).not.toContain(credentials.totpSecret);
  });
});

describe("one-time credential mutations", () => {
  it("drop the issued secrets from the mutation cache once dismissed", async () => {
    vi.useFakeTimers();
    try {
      const client = makeQueryClient();
      const observer = new MutationObserver(client, {
        mutationFn: async () => credentials,
        gcTime: ONE_TIME_GC_MS,
      });
      const unsubscribe = observer.subscribe(() => undefined);
      await observer.mutate();
      expect(observer.getCurrentResult().data).toEqual(credentials);

      observer.reset();
      unsubscribe();
      await vi.advanceTimersByTimeAsync(10);
      expect(client.getMutationCache().getAll()).toEqual([]);

      expect(observer.getCurrentResult().data).toBeUndefined();
      expect(JSON.stringify(client.getMutationCache().getAll().map((mutation) => mutation.state.data))).not.toContain(
        credentials.temporaryPassword,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
