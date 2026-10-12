import type { LeadSource, LeadStatus } from "@nextera/contracts";
import type { Tone } from "@/lib/format";

export type { Tone };

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

export const leadStatusTones: Record<LeadStatus, Tone> = {
  new: "info",
  contacted: "warning",
  qualified: "warning",
  converted: "success",
  lost: "neutral",
};

export const leadSourceLabels: Record<LeadSource, string> = {
  web: "Website",
  admin: "Added by staff",
};

export function maskIp(ip: string | null): string {
  if (!ip) return "—";
  if (ip.includes(":")) {
    const groups = ip.split(":").filter(Boolean).slice(0, 4);
    return groups.length > 0 ? `${groups.join(":")}::/64` : "—";
  }
  const octets = ip.split(".");
  return octets.length === 4 ? `${octets.slice(0, 3).join(".")}.x` : "—";
}
