import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { meQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";
import { brand } from "@/lib/site";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const { customer } = await requireCustomer();
  const queryClient = getServerQueryClient();
  queryClient.setQueryData(meQuery().queryKey, { customer });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-svh flex-col">
        <PortalHeader />
        <main id="main" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-6 sm:py-12 md:px-8">
          {children}
        </main>
        <footer className="border-t border-parchment/10">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-6 text-xs text-dust sm:flex-row sm:justify-between sm:px-6 md:px-8">
            <p>
              {brand.name} is {brand.byline}.
            </p>
            <a href={`mailto:${brand.email}`} className="hover:text-gold">
              {brand.email}
            </a>
          </div>
        </footer>
      </div>
    </HydrationBoundary>
  );
}
