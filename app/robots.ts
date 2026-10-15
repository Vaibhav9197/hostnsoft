import type { MetadataRoute } from "next";
import { SITE } from "./lib/site";

/**
 * Generated as /robots.txt.
 *
 * Everything public is crawlable; the disallow list is the signed-in console,
 * the admin tools, and the API — pages with nothing to offer a search result.
 * /guide-raw/ is where middleware sends /docs/*.md: crawlers should only ever
 * see it under its /docs address.
 *
 * The /v1../v4 landing variants are deliberately NOT listed. They are the same
 * page as `/` behind middleware and must stay out of the index, but middleware
 * already sends them `X-Robots-Tag: noindex` — and a crawler that is blocked
 * here never fetches them, so it never sees that header. Blocking would leave
 * them eligible to be indexed as bare URLs; letting them be crawled is what
 * gets them dropped.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/admin/", "/api/", "/connector/", "/guide-raw/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
