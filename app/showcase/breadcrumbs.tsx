import { SITE } from "../lib/site";

/**
 * BreadcrumbList structured data for a Showcase page. Same shape as the docs
 * (see app/docs/renderDoc.tsx): tells Google where the page sits in the site,
 * so a result can read "Embarko › Showcase › Weather Bot" instead of a bare
 * URL. `trail` is everything below /showcase, each entry a site-relative path.
 */
export function ShowcaseBreadcrumbs({ trail }: { trail: Array<{ name: string; path: string }> }) {
  const crumbs = [
    { name: "Embarko", item: SITE },
    { name: "Showcase", item: `${SITE}/showcase` },
    ...trail.map((t) => ({ name: t.name, item: `${SITE}${t.path}` })),
  ];
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
