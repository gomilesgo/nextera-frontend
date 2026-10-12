"use client";

import type { AssigneeFilter } from "@/lib/filters";
import { useAssignees } from "@/lib/useAssignees";

export function AssigneeFilterOptions({ selected }: { selected?: AssigneeFilter }) {
  const { options } = useAssignees();
  const others = options.slice(1);
  const unknown = selected && selected !== "none" && selected !== "me" && !others.some((option) => option.id === selected);

  return (
    <>
      <option value="">Anyone</option>
      <option value="none">Unassigned</option>
      <option value="me">Me</option>
      {others.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
      {unknown ? <option value={selected}>Selected staff member</option> : null}
    </>
  );
}
