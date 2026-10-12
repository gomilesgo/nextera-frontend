import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PlansTable } from "@/components/plans/PlansTable";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { can } from "@/lib/permissions";
import { loadPlans } from "@/lib/plans/api";
import { planQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { firstParam } from "@/lib/request";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const { staff, token } = await requirePermission("plans.view");
  const canWrite = can(staff.role, "plans.write");
  const saved = firstParam((await searchParams).saved);

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...planQueries.list(), queryFn: () => loadPlans(token) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Catalogue"
        title="Plans"
        description={
          canWrite
            ? "Drafts are hidden from customers until activated. Archived plans stop taking new investments."
            : "You have read-only access to plans."
        }
        actions={canWrite ? <ButtonLink href="/plans/new">New plan</ButtonLink> : null}
      />
      {saved === "deleted" ? <Notice tone="success">Draft plan deleted.</Notice> : null}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PlansTable canWrite={canWrite} />
      </HydrationBoundary>
    </div>
  );
}
