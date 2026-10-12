import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { KycView } from "@/components/portal/KycView";
import { loadKyc } from "@/lib/queries/loaders";
import { kycQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "KYC" };

export default async function KycPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery(kycQuery(() => loadKyc(token)));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KycView />
    </HydrationBoundary>
  );
}
