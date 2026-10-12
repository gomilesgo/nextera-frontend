import type { StaffRef } from "@nextera/contracts";

export type AssigneeOption = { id: string; name: string };

type AssignableItem = { id: string; name: string; disabledAt: string | null };

export function assigneeOptions(
  me: StaffRef,
  staff: readonly AssignableItem[] | undefined,
  current: StaffRef | null = null,
): AssigneeOption[] {
  const options = new Map<string, AssigneeOption>();
  options.set(me.id, { id: me.id, name: `${me.name} (you)` });
  for (const member of staff ?? []) {
    if (!member.disabledAt && !options.has(member.id)) options.set(member.id, { id: member.id, name: member.name });
  }
  if (current && !options.has(current.id)) options.set(current.id, { id: current.id, name: current.name });
  const [mine, ...rest] = [...options.values()];
  return mine ? [mine, ...rest.sort((a, b) => a.name.localeCompare(b.name))] : rest;
}
