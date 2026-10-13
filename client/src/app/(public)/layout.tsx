import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate">
      <PublicHeader />
      <main id="main" className="relative z-[1] min-w-0">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
