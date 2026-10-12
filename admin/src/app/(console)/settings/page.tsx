import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { settingsQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { loadSettings } from "@/lib/settings/api";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { token } = await requirePermission("settings.manage");

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...settingsQueries.current(), queryFn: () => loadSettings(token) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Platform-wide values used by accruals and withdrawals."
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SettingsForm />
      </HydrationBoundary>
    </div>
  );
}
