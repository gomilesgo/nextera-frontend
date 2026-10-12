import type { QueryClient } from "@tanstack/react-query";
import type { AdminLead, LeadConvertResponse } from "@nextera/contracts";
import { queryKeys } from "@/lib/queries/keys";
import { leadKeys } from "@/lib/queries/leads";

export async function syncLead(queryClient: QueryClient, lead: AdminLead): Promise<void> {
  queryClient.setQueryData(leadKeys.detail(lead.id), { lead });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: leadKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: leadKeys.detail(lead.id) }),
  ]);
}

export async function syncConversion(queryClient: QueryClient, result: LeadConvertResponse): Promise<void> {
  await Promise.all([
    syncLead(queryClient, result.lead),
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
  ]);
}
