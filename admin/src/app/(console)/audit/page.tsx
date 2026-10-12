import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { AuditView } from "@/components/audit/AuditView";
import { loadAuditEntry, loadAuditLog } from "@/lib/audit/api";
import { parseAuditEntryId, parseAuditFilters } from "@/lib/audit/filters";
import { auditQueries } from "@/lib/queries/audit";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const { token } = await requirePermission("audit.view");
  const params = await searchParams;
  const filters = parseAuditFilters(params);
  const entryId = parseAuditEntryId(params);

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...auditQueries.list(filters), queryFn: () => loadAuditLog(token, filters) });
  if (entryId) {
    const entry = await loadAuditEntry(token, entryId);
    if (entry) queryClient.setQueryData(auditQueries.detail(entryId).queryKey, entry);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuditView />
    </HydrationBoundary>
  );
}
