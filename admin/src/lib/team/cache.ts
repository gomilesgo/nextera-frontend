import type { QueryClient } from "@tanstack/react-query";
import type { StaffMember } from "@nextera/contracts";
import { queryKeys } from "@/lib/queries/keys";
import type { StaffListResponse } from "@/lib/queries/options";

export const ONE_TIME_GC_MS = 0;

export async function syncStaffMember(queryClient: QueryClient, member: StaffMember): Promise<void> {
  queryClient.setQueryData<StaffListResponse>(queryKeys.staff.list(), (current) => {
    if (!current) return current;
    const exists = current.staff.some((candidate) => candidate.id === member.id);
    return {
      staff: exists
        ? current.staff.map((candidate) => (candidate.id === member.id ? member : candidate))
        : [...current.staff, member],
    };
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
}
