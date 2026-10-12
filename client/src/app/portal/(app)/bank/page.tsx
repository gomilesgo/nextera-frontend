import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { BankView } from "@/components/portal/BankView";
import { loadBankAccounts, loadKyc } from "@/lib/queries/loaders";
import { bankAccountsQuery, kycQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Bank accounts" };

export default async function BankPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  await Promise.all([
    queryClient.fetchQuery(kycQuery(() => loadKyc(token))),
    queryClient.fetchQuery(bankAccountsQuery(() => loadBankAccounts(token))),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BankView />
    </HydrationBoundary>
  );
}
