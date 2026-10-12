"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IBM_Plex_Mono, Instrument_Sans, Syne } from "next/font/google";
import { brand } from "@/lib/site";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["600"] });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", weight: ["400", "500"] });
const plex = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-plex", weight: ["400"] });

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[global]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en-IN" className={`${syne.variable} ${instrument.variable} ${plex.variable} h-full antialiased`}>
      <body className="min-h-full bg-inkwell font-sans text-parchment">
        <title>{`Something went wrong · ${brand.name}`}</title>
        <main className="orbit-glow flex min-h-svh items-center justify-center px-4">
          <div className="grid max-w-xl gap-6 text-center" role="alert">
            <p className="font-display text-sm uppercase tracking-[0.2em]">{brand.name}</p>
            <p className="eyebrow">Something went wrong</p>
            <h1 className="font-display text-3xl">Nextera hit an unexpected problem.</h1>
            <p className="text-parchment/75">
              Please try again in a moment. Your account and any money with us are not affected. If this keeps
              happening, email {brand.email}.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => retry()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-medium text-ink hover:bg-parchment"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-parchment/25 px-5 text-sm font-medium hover:border-lagoon hover:text-lagoon"
              >
                Go to the home page
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
