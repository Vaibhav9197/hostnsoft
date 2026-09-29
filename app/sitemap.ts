import type { MetadataRoute } from "next";
import { DOCS } from "./lib/docs";
import { categorySlug, listApps, tagSlug, listIndexableCollections } from "./lib/showcase";
import { SITE } from "./lib/site";

/**
 * The public URL list handed to search engines, generated as /sitemap.xml.
 *
 * Rendered per request, not at build time, because the Showcase is in it: the
 * apps people list and the pages they are listed under change daily, and a
 * sitemap frozen at deploy time would never name a new one. The Showcase reads
 * go over HTTP to the API, so nothing here needs the D1 binding that is absent
 * during `next build`.
 *
 * The static pages are always listed. If the Showcase read fails, the sitemap
 * still returns them — a partial sitemap is far better than a 500, which
 * Google treats as "this sitemap is broken" and stops trusting.
 *
 * Left out on purpose: /app and /admin (signed-in only), /connector, the
 * /v1../v4 landing variants (duplicates of `/` chosen by middleware), and
 * Showcase collections with no public app yet — the collection page marks
 * itself noindex until something is in it, and a sitemap should not contradict
 * that.
 */
export const dynamic = "force-dynamic";

/* The API refuses anything above 200 per request. That is the whole Showcase
   for now; once it grows past this, page through with `offset` here (the API
   accepts it) and, past 50,000 URLs, split into a sitemap index. */
const SHOWCASE_LIMIT = 200;

async function showcaseEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const [apps, collections] = await Promise.all([
      listApps(SHOWCASE_LIMIT),
      listIndexableCollections(),
    ]);
    /* Only categories that currently hold a public app — the category page
       marks itself noindex when empty, so listing it would contradict that. */
    const categories = [...new Set(apps.map((a) => a.category).filter((c): c is string => !!c))];
    const tags = [...new Set(apps.flatMap((a) => a.tags.map(tagSlug)).filter(Boolean))];
    return [
      ...collections.map((c) => ({
        url: `${SITE}/showcase/${encodeURIComponent(c.slug)}`,
        lastModified: c.createdAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...apps.map((app) => ({
        url: `${SITE}/showcase/app/${encodeURIComponent(app.slug)}`,
        lastModified: app.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...categories.map((c) => ({
        url: `${SITE}/showcase/category/${categorySlug(c)}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...tags.map((t) => ({
        url: `${SITE}/showcase/tag/${t}`,
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("sitemap: showcase unavailable, listing static pages only", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The static pages carry no lastModified: the only date available for them
  // is "now", which would mark every page changed on every request. Showcase
  // entries have a real date and use it.
  // The docs are the pages we most want indexed, and three of the four are
  // linked from nowhere in the site chrome — the sitemap is how they are found.
  const docs = DOCS.map((doc) => ({
    url: `${SITE}${doc.path}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const pages: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["/", 1.0, "daily"],
    ["/pricing", 0.9, "weekly"],
    ["/showcase", 0.9, "daily"],
    ["/skill", 0.9, "daily"],
    ["/status", 0.6, "daily"],
    ["/support", 0.5, "monthly"],
    ["/security", 0.6, "monthly"],
    ["/terms", 0.6, "yearly"],
    ["/privacy", 0.6, "yearly"],
    ["/dpa", 0.6, "yearly"],
    ["/abuse", 0.6, "yearly"],
  ];

  const showcase = await showcaseEntries();

  return [
    ...pages.map(([path, priority, changeFrequency]) => ({
      url: `${SITE}${path}`,
      changeFrequency,
      priority,
    })),
    ...docs,
    ...showcase,
  ];
}
