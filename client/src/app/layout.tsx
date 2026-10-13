import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { brand } from "@/lib/site";
import "./globals.css";

const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-plex-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#0c1220",
};

export const metadata: Metadata = {
  title: {
    default: `${brand.name}: fixed monthly returns, ${brand.byline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.positioning,
  metadataBase: new URL(brand.url),
  applicationName: brand.name,
  icons: { icon: "/brand-mark.svg" },
  openGraph: {
    type: "website",
    siteName: `${brand.name}, ${brand.byline}`,
    locale: "en_IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${plexSerif.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-inkwell font-sans text-parchment">
        <a
          href="#main"
          className="sr-only z-[60] rounded-full bg-gold px-4 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
