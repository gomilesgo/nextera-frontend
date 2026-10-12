import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { CustomerHeader } from "@/components/customers/CustomerHeader";
import { customerAccess } from "@/lib/customers/access";
import { loadCustomer } from "@/lib/customers/api";
import { isCustomerId } from "@/lib/customers/shape";
import { customerQueries } from "@/lib/queries/customers";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export default async function CustomerLayout({ children, params }: LayoutProps<"/customers/[id]">) {
  const { id } = await params;
  const { staff, token } = await requirePermission("customers.view");
  if (!isCustomerId(id)) notFound();
  const detail = await loadCustomer(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(customerQueries.detail(id).queryKey, detail);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="grid gap-6">
        <CustomerHeader customerId={id} access={customerAccess(staff.role)} />
        {children}
      </div>
    </HydrationBoundary>
  );
}
