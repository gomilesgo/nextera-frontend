import type { MetadataRoute } from "next";
import { brand } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${brand.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${brand.url}/enquire`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
