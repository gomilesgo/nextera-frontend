import Link from "next/link";
import { brand, disclaimer } from "@/lib/site";

/**
 * Act seven is the authored silence: a hard cut to paper, black type on ivory,
 * and nothing on this screen moves.
 */
export function Terms() {
  return (
    <section id="risks" className="paper" aria-labelledby="risks-heading">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-[clamp(3.5rem,8vw,7rem)] pb-[calc(clamp(3.5rem,8vw,7rem)+var(--bar-h))] sm:px-6 md:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] paper-accent">Disclosures</p>
          <h2 id="risks-heading" className="mt-5 font-display h-section">
            Read this before you invest.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 paper-soft">
            We want you to understand exactly what you are buying. If anything here is unclear, ask us before you
            invest, not after.
          </p>
          <p className="mt-6 text-sm leading-7 paper-soft">
            <Link href="/enquire" className="font-medium underline paper-accent">
              Ask a question
            </Link>{" "}
            or write to {brand.email}.
          </p>
        </div>

        <ol className="grid gap-0 text-[0.95rem] leading-7">
          {disclaimer.map((item, index) => (
            <li
              key={item}
              className={`grid grid-cols-[2.5rem_1fr] gap-x-2 border-t paper-rule py-6 ${
                index === disclaimer.length - 1 ? "border-b" : ""
              }`}
            >
              <span aria-hidden="true" className="font-mono text-xs tnum paper-soft">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="max-w-[62ch]">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
