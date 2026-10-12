"use client";

import { useQuery } from "@tanstack/react-query";
import { flagCountLabel, paymentQueries } from "@/lib/queries/payments";

export function OpenFlagsBadge() {
  const { data: count } = useQuery(paymentQueries.openFlagCount());
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-ember/20 px-1.5 font-mono text-[10.5px] text-ember">
      {flagCountLabel(count)}
      <span className="sr-only"> open</span>
    </span>
  );
}
