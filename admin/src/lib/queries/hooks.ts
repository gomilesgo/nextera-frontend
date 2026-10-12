import { useQuery } from "@tanstack/react-query";
import { planQueries, sessionQueries } from "./options";

export function useStaff() {
  const query = useQuery(sessionQueries.me());
  return { ...query, staff: query.data?.staff ?? null };
}

export function usePlans() {
  return useQuery(planQueries.list());
}

export function usePlan(id: string) {
  return useQuery(planQueries.detail(id));
}
