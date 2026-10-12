import { describe, expect, it } from "vitest";
import type { StaffMember } from "@nextera/contracts";
import { assigneeOptions } from "@/lib/assignees";
import { maskIp } from "@/lib/leads/labels";
import { ageLabel, ticketWait } from "@/lib/support/labels";

const now = Date.parse("2026-10-12T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

describe("ticket age", () => {
  it("reads as minutes, hours then days", () => {
    expect(ageLabel(new Date(now - 20_000).toISOString(), now)).toBe("just now");
    expect(ageLabel(hoursAgo(0.5), now)).toBe("30m");
    expect(ageLabel(hoursAgo(5), now)).toBe("5h");
    expect(ageLabel(hoursAgo(72), now)).toBe("3d");
    expect(ageLabel("garbage", now)).toBe("—");
  });

  it("flags open tickets against their priority's response target", () => {
    expect(ticketWait({ status: "open", priority: "urgent", lastMessageAt: hoursAgo(1) }, now)).toEqual({
      label: "1h",
      tone: "info",
      overdue: false,
    });
    expect(ticketWait({ status: "open", priority: "urgent", lastMessageAt: hoursAgo(3) }, now).tone).toBe("warning");
    expect(ticketWait({ status: "open", priority: "urgent", lastMessageAt: hoursAgo(5) }, now)).toEqual({
      label: "5h, overdue",
      tone: "danger",
      overdue: true,
    });
    expect(ticketWait({ status: "open", priority: "low", lastMessageAt: hoursAgo(30) }, now).overdue).toBe(false);
  });

  it("does not count time spent waiting on the customer", () => {
    expect(ticketWait({ status: "pending_customer", priority: "urgent", lastMessageAt: hoursAgo(50) }, now)).toEqual({
      label: "Customer, 2d",
      tone: "neutral",
      overdue: false,
    });
  });
});

describe("maskIp", () => {
  it("hides the host part of IPv4 and IPv6 addresses", () => {
    expect(maskIp("203.0.113.42")).toBe("203.0.113.x");
    expect(maskIp("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe("2001:db8:85a3:8d3::/64");
    expect(maskIp(null)).toBe("—");
    expect(maskIp("unknown")).toBe("—");
  });
});

describe("assigneeOptions", () => {
  const me = { id: "me-1", name: "Asha" };
  const member = (id: string, name: string, disabledAt: string | null = null): StaffMember => ({
    id,
    name,
    email: `${id}@srahira.com`,
    role: "support",
    mustChangePassword: false,
    disabledAt,
    lockedUntil: null,
    createdAt: "2026-10-01T00:00:00.000Z",
  });

  it("puts the viewer first and skips disabled staff", () => {
    const options = assigneeOptions(me, [member("z", "Zoe"), member("me-1", "Asha"), member("b", "Bala"), member("x", "Xi", "2026-10-02")]);
    expect(options).toEqual([
      { id: "me-1", name: "Asha (you)" },
      { id: "b", name: "Bala" },
      { id: "z", name: "Zoe" },
    ]);
  });

  it("keeps the current assignee even when the staff list is unavailable", () => {
    expect(assigneeOptions(me, undefined, { id: "q", name: "Quinn" })).toEqual([
      { id: "me-1", name: "Asha (you)" },
      { id: "q", name: "Quinn" },
    ]);
  });
});
