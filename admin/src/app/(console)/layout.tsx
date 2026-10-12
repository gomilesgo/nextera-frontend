import type { ReactNode } from "react";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Sidebar } from "@/components/shell/Sidebar";
import { sessionQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireStaff } from "@/lib/session";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const { staff } = await requireStaff({ allowPasswordChange: true });
  const queryClient = getServerQueryClient();
  queryClient.setQueryData(sessionQueries.me().queryKey, { staff });

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Sidebar />
      </HydrationBoundary>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
