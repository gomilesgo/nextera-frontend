import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { brand } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `Portal · ${brand.name}`,
    template: `%s · ${brand.name} portal`,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: "same-origin",
};

export default function PortalRootLayout({ children }: LayoutProps<"/portal">) {
  return <QueryProvider>{children}</QueryProvider>;
}
