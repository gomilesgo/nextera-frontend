import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.join(__dirname, "..", "..");

const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" };

const pdfRoutes = ["/api/investments/:id/agreement", "/api/investments/:id/bond", "/api/documents/:id/file"];

const sameOriginFrame = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  noindex,
];

const nextConfig: NextConfig = {
  transpilePackages: ["@nextera/contracts"],
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      { source: "/portal", headers: [noindex] },
      { source: "/portal/:path*", headers: [noindex] },
      ...pdfRoutes.map((source) => ({ source, headers: sameOriginFrame })),
    ];
  },
};

export default nextConfig;
