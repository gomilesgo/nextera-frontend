"use client";

import { useQuery } from "@tanstack/react-query";
import { StaffRowActions } from "@/components/staff/StaffRowActions";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime } from "@/lib/format";
import { staffQueries } from "@/lib/queries/options";
import { roleLabels } from "@/lib/staff";
import { OWNER_RESET_COMMAND, memberState, memberStateLabels } from "@/lib/team/labels";

const stateTones = { active: "success", disabled: "danger", locked: "warning", pending: "info" } as const;

export function StaffTable({ viewerId, renderedAt }: { viewerId: string; renderedAt: string }) {
  const { data, error, isPending, isFetching } = useQuery(staffQueries.list());
  const now = new Date(renderedAt);

  if (isPending) return <p className="text-sm text-dust">Loading staff…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const staff = data?.staff ?? [];

  return (
    <div className="grid gap-3">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Added</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const state = memberState(member, now);
              return (
                <tr key={member.id}>
                  <td>
                    <span className="font-medium">{member.name}</span>
                    {member.id === viewerId ? <span className="ml-2 text-xs text-lagoon">You</span> : null}
                    <div className="text-xs text-dust">{member.email}</div>
                  </td>
                  <td>{roleLabels[member.role]}</td>
                  <td>
                    <Badge tone={stateTones[state]}>{memberStateLabels[state]}</Badge>
                    {state === "locked" ? (
                      <div className="mt-1 text-xs text-dust">Until {formatDateTime(member.lockedUntil)}</div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap text-dust">{formatDateTime(member.createdAt)}</td>
                  <td className="text-right">
                    <StaffRowActions member={member} viewerId={viewerId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
      <p className="text-xs text-dust">
        Owner credentials cannot be reset from the console. Run{" "}
        <code className="font-mono text-parchment">{OWNER_RESET_COMMAND}</code> on a machine with backend access.
        Change your own password from the Password link in the sidebar.
      </p>
    </div>
  );
}
