import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadAnalyticsOverview } from "@/lib/analytics/api";
import { resolveAnalyticsRange } from "@/lib/analytics/range";
import { analyticsQueries } from "@/lib/queries/analytics";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const { token } = await requirePermission("analytics.view");
  const sp = await searchParams;
  const { from, to } = resolveAnalyticsRange({ from: sp.from, to: sp.to });

  const queryClient = getServerQueryClient();
  await queryClient.prefetchQuery({
    ...analyticsQueries.overview({ from, to }),
    queryFn: () => loadAnalyticsOverview(token, { from, to }),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Analytics"
        description="Platform-wide metrics. Select a month range to drill into a period."
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AnalyticsView from={from} to={to} />
      </HydrationBoundary>
    </div>
  );
}
