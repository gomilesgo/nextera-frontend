import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { HistoryView } from "@/components/portal/HistoryView";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  await requireCustomer();
  const queryClient = getServerQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HistoryView />
    </HydrationBoundary>
  );
}
