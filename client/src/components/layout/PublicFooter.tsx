import Link from "next/link";
import { BrandLink } from "@/components/brand/BrandLink";
import { brand } from "@/lib/site";

const columns = [
  {
    title: "Nextera",
    items: [
      { href: "/#balances", label: "What stays, what moves" },
      { href: "/#year", label: "A year, written out" },
      { href: "/#plans", label: "Plans" },
      { href: "/#calculator", label: "Returns calculator" },
      { href: "/#process", label: "How it works" },
      { href: "/#record", label: "Your portal" },
      { href: "/#risks", label: "Disclosures" },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/portal/login", label: "Sign in" },
      { href: "/enquire", label: "Enquire" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="relative z-[1] overflow-hidden border-t border-parchment/10 bg-inkwell">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 left-0 font-display text-[16vw] leading-none text-parchment/[0.035] sm:-bottom-8"
      >
        NEXTERA
      </p>
      <div className="relative mx-auto max-w-[1320px] px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <BrandLink />
            <p className="mt-4 max-w-sm text-sm leading-7 text-dust">{brand.positioning}</p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="eyebrow">{column.title}</p>
              <ul className="mt-4 space-y-2">
                {column.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-parchment/75 transition-colors hover:text-gold">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="gold-rule my-8 sm:my-12" />
        <div className="flex flex-col gap-2 text-xs text-dust sm:text-sm md:flex-row md:items-center md:justify-between">
          <p>
            {brand.name} is {brand.byline}.{" "}
            <a href={brand.parentUrl} className="text-parchment/80 hover:text-gold" rel="noopener">
              srahira.com
            </a>
          </p>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
            <a href={`mailto:${brand.email}`} className="hover:text-gold">
              {brand.email}
            </a>
            <p>{brand.city}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
