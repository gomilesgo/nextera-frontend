import type { StaffMember } from "@nextera/contracts";

export const OWNER_RESET_COMMAND = "npm run staff:reset -w @nextera/backend -- <email>";

export function clearClipboard(clipboard: Pick<Clipboard, "writeText"> | undefined): void {
  try {
    clipboard?.writeText("").catch(() => undefined);
  } catch {}
}

export function groupSecret(secret: string): string {
  return secret.replace(/=+$/, "").match(/.{1,4}/g)?.join(" ") ?? secret;
}

export type MemberState = "active" | "disabled" | "locked" | "pending";

export function memberState(member: StaffMember, now: Date): MemberState {
  if (member.disabledAt) return "disabled";
  if (member.lockedUntil && new Date(member.lockedUntil).getTime() > now.getTime()) return "locked";
  if (member.mustChangePassword) return "pending";
  return "active";
}

export const memberStateLabels: Record<MemberState, string> = {
  active: "Active",
  disabled: "Disabled",
  locked: "Locked",
  pending: "Awaiting first sign-in",
};

export type MemberActions = {
  self: boolean;
  changeRole: boolean;
  toggleAccess: boolean;
  resetCredentials: boolean;
  ownerReset: boolean;
};

export function memberActions(member: StaffMember, viewerId: string): MemberActions {
  const self = member.id === viewerId;
  return {
    self,
    changeRole: !self,
    toggleAccess: !self,
    resetCredentials: !self && member.role !== "owner",
    ownerReset: !self && member.role === "owner",
  };
}
