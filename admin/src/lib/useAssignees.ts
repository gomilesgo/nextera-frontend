"use client";

import { useQuery } from "@tanstack/react-query";
import type { StaffRef } from "@nextera/contracts";
import { assigneeOptions } from "@/lib/assignees";
import type { AssigneeOption } from "@/lib/assignees";
import { useStaff } from "@/lib/queries/hooks";
import { staffQueries } from "@/lib/queries/options";

export function useAssignees(current: StaffRef | null = null): { me: StaffRef | null; options: AssigneeOption[] } {
  const { staff } = useStaff();
  const list = useQuery({ ...staffQueries.assignable(), enabled: Boolean(staff) });
  if (!staff) return { me: null, options: current ? [current] : [] };
  const me = { id: staff.id, name: staff.name };
  const members = list.data?.staff.map((s) => ({ id: s.id, name: s.name, disabledAt: null }));
  return { me, options: assigneeOptions(me, members, current) };
}
