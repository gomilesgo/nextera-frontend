import type { MetadataRoute } from "next";
import { brand } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/portal"] },
    sitemap: `${brand.url}/sitemap.xml`,
  };
}
