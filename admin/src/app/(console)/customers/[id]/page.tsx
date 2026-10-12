import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { CustomerOverview } from "@/components/customers/CustomerOverview";
import { customerAccess } from "@/lib/customers/access";
import { loadCustomer } from "@/lib/customers/api";
import { isCustomerId } from "@/lib/customers/shape";
import { customerQueries } from "@/lib/queries/customers";
import { getServerQueryClient } from "@/lib/queries/server";
import { firstParam } from "@/lib/request";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Customer" };

const savedMessages: Record<string, string> = { created: "Customer created." };

export default async function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const { staff, token } = await requirePermission("customers.view");
  if (!isCustomerId(id)) notFound();
  const detail = await loadCustomer(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(customerQueries.detail(id).queryKey, detail);
  const saved = savedMessages[firstParam((await searchParams).saved) ?? ""];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomerOverview customerId={id} access={customerAccess(staff.role)} savedMessage={saved} />
    </HydrationBoundary>
  );
}
