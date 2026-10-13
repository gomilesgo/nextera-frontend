"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import type { Plan } from "@nextera/contracts";
import { PlanCard } from "@/components/plans/PlanCard";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollVar } from "./useScrollVar";

export type RailItem = { plan: Plan; href: string };

export function PlanRail({ items }: { items: RailItem[] }) {
  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const reduced = usePrefersReducedMotion();

  useScrollVar(ref, !reduced);

  useEffect(() => {
    const section = ref.current;
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!section || !frame || !track) return;

    const measure = () => {
      const travel = Math.max(0, track.scrollWidth - frame.clientWidth);
      section.style.setProperty("--travel", String(Math.round(travel)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="plans"
      className="act border-t border-border"
      style={{ height: "calc(100svh + var(--travel, 0) * 1px)" } as CSSProperties}
      aria-labelledby="plans-heading"
    >
      <div className="act-pin flex flex-col justify-center">
        <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 md:px-8">
          <h2 id="plans-heading" className="font-display h-section text-parchment">
            Live plans, open now.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-parchment/75">
            The rate is fixed for the life of your investment. Returns are simple interest on your principal, credited
            monthly.
          </p>
        </div>

        <div ref={frameRef} className="rail-frame mt-10 overflow-hidden pb-[calc(var(--bar-h)+0.5rem)]">
          <ul
            ref={trackRef}
            className="rail-track flex w-max gap-4 px-4 sm:px-6 md:px-8"
            style={{
              transform: "translate3d(calc(var(--p) * var(--travel, 0) * -1px), 0, 0)",
              paddingLeft: "max(1rem, calc(50vw - 660px))",
            }}
          >
            {items.map(({ plan, href }) => (
              <li key={plan.id} className="w-[76vw] max-w-[360px] shrink-0 sm:w-[340px]">
                <PlanCard plan={plan} href={href} cta="Sign in to invest" />
              </li>
            ))}
            <li className="w-[76vw] max-w-[360px] shrink-0 sm:w-[340px]">
              <div className="flex h-full flex-col justify-between rounded-[3px] border border-dashed border-parchment/20 p-6 sm:p-7">
                <div>
                  <p className="label">Not listed here</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight text-parchment">
                    Looking for a different tenure?
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-parchment/75">
                    Online investing is opening in stages. Tell us the amount and the tenure you want and we will
                    tell you when it opens.
                  </p>
                </div>
                <Link
                  href="/enquire"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-parchment"
                >
                  Send an enquiry
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
