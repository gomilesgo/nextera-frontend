"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLink } from "@/components/brand/BrandLink";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { headerNav, publicNav } from "@/lib/site";

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Coalesced into a frame and compared before setting state, so an ordinary
    // scroll does not queue a React render per scroll event.
    let frame = 0;
    // Starts from the server-rendered value; the first frame syncs it.
    let current = false;

    const read = () => {
      frame = 0;
      const next = window.scrollY > 32;
      if (next === current) return;
      current = next;
      setScrolled(next);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    frame = requestAnimationFrame(read);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div
        className={cx(
          "border-b transition-colors duration-300",
          // Smaller blur radii: the header is on screen for the whole scroll,
          // and a 24px backdrop blur there is the most expensive thing on it.
          scrolled || open
            ? "border-parchment/15 bg-inkwell/90 shadow-[inset_0_1px_0_rgba(244,247,241,0.16)] backdrop-blur-sm"
            : "border-transparent bg-inkwell/25 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
          <BrandLink />

          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {headerNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-parchment/70 transition-colors hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/portal/login" className={buttonClass("gold", "sm", "hidden sm:inline-flex")}>
              Sign in
            </Link>
            <button
              type="button"
              className="inline-flex size-11 touch-manipulation items-center justify-center rounded-full border border-parchment/20 lg:hidden"
              aria-expanded={open}
              aria-controls="public-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              <span aria-hidden="true" className="relative block h-3 w-4">
                <span className={cx("absolute inset-x-0 h-px bg-parchment transition", open ? "top-1.5 rotate-45" : "top-0")} />
                <span className={cx("absolute inset-x-0 top-1.5 h-px bg-parchment transition", open ? "opacity-0" : undefined)} />
                <span className={cx("absolute inset-x-0 h-px bg-parchment transition", open ? "top-1.5 -rotate-45" : "top-3")} />
              </span>
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div
          id="public-menu"
          className="fixed inset-x-0 bottom-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-50 overflow-y-auto overscroll-contain bg-inkwell px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <nav aria-label="Main" className="flex flex-col gap-1">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-parchment/10 py-3 font-display text-[clamp(1.5rem,6vw,2rem)] text-parchment"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/portal/login" onClick={() => setOpen(false)} className={buttonClass("gold", "lg", "mt-6 w-full")}>
              Sign in to your portal
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
