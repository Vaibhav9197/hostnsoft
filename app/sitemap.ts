import type { MetadataRoute } from "next";
import { DOCS } from "./lib/docs";
import { SITE } from "./lib/site";

/**
 * The public URL list handed to search engines, generated as /sitemap.xml.
 *
 * Deliberately static: this runs during `next build`, where the D1 binding does
 * not exist, so it must not read the database. That leaves the per-app Showcase
 * pages out for now — they are reachable by crawl from /showcase, and adding
 * them here would mean making the sitemap dynamic.
 *
 * Also left out on purpose: /app and /admin (signed-in only), /connector, and
 * the /v1../v4 landing variants, which are duplicates of `/` chosen by
 * middleware and would compete with it in search.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // The docs are the pages we most want indexed, and three of the four are
  // linked from nowhere in the site chrome — the sitemap is how they are found.
  const docs = DOCS.map((doc) => ({
    url: `${SITE}${doc.path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const pages: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["/", 1.0, "weekly"],
    ["/pricing", 0.9, "weekly"],
    ["/showcase", 0.7, "daily"],
    ["/showcase/submit", 0.5, "monthly"],
    ["/status", 0.4, "daily"],
    ["/security", 0.4, "monthly"],
    ["/terms", 0.3, "yearly"],
    ["/privacy", 0.3, "yearly"],
    ["/dpa", 0.3, "yearly"],
    ["/abuse", 0.3, "yearly"],
  ];

  return [
    ...pages.map(([path, priority, changeFrequency]) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...docs,
  ];
}
