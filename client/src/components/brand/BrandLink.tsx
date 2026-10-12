import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/site";

export function BrandLink({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex min-w-0 shrink-0 items-center gap-2.5" aria-label={`${brand.name} home`}>
      <Image src="/brand-mark.svg" alt="" width={28} height={28} priority className="orbit-b" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display text-base uppercase tracking-[0.16em] text-parchment sm:text-lg sm:tracking-[0.2em]">
          {brand.name}
        </span>
        {compact ? null : (
          <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-dust sm:block">
            {brand.byline}
          </span>
        )}
      </span>
    </Link>
  );
}
