import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { InviteStaff } from "@/components/staff/InviteStaff";
import { StaffTable } from "@/components/staff/StaffTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { staffQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { loadStaffList } from "@/lib/team/api";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const { staff, token } = await requirePermission("staff.manage");

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...staffQueries.list(), queryFn: () => loadStaffList(token) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Administration"
        title="Staff"
        description="Invite colleagues, change their role, or disable access. Every change is audited."
        actions={<InviteStaff />}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <StaffTable viewerId={staff.id} renderedAt={new Date().toISOString()} />
      </HydrationBoundary>
    </div>
  );
}
