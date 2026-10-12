import type { Metadata } from "next";
import { PlanForm } from "@/components/plans/PlanForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "New plan" };

export default async function NewPlanPage() {
  await requirePermission("plans.write");

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Plans" title="New plan" />
      <div className="hairline max-w-3xl rounded-[3px] bg-horizon/40 p-5">
        <PlanForm />
      </div>
    </div>
  );
}
