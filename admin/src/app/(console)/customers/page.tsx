import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { CustomersView } from "@/components/customers/CustomersView";
import { loadCustomers } from "@/lib/customers/api";
import { parseCustomerFilters } from "@/lib/customers/filters";
import { can } from "@/lib/permissions";
import { customerQueries } from "@/lib/queries/customers";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const { staff, token } = await requirePermission("customers.view");
  const filters = parseCustomerFilters(await searchParams);

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...customerQueries.list(filters), queryFn: () => loadCustomers(token, filters) });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomersView canWrite={can(staff.role, "customers.write")} />
    </HydrationBoundary>
  );
}
