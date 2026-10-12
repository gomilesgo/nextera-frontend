import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { WalletView } from "@/components/portal/WalletView";
import { loadWallet } from "@/lib/queries/loaders";
import { walletQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  const wallet = await loadWallet(token).catch((err: unknown) => {
    unstable_rethrow(err);
    console.error("[wallet] unavailable:", err instanceof Error ? err.message : err);
    return null;
  });
  if (wallet) queryClient.setQueryData(walletQuery().queryKey, wallet);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WalletView />
    </HydrationBoundary>
  );
}
