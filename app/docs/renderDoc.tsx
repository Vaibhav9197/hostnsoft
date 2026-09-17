import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "./DocView";
import { docBySlug, docMarkdown, extractToc } from "../lib/docs";
import { SITE } from "../lib/site";

/**
 * Shared body for every published-doc route. The markdown is bundled from
 * content/docs/, so this does no IO and can't fail at request time — an
 * unknown slug is the only way through to notFound().
 */
export function renderDoc(slug: string) {
  const meta = docBySlug(slug);
  const markdown = docMarkdown(slug);
  if (!meta || markdown === undefined) notFound();

  /* Tells Google where this page sits in the site, so results can show
     "Embarko › Docs › Troubleshooting" instead of a bare URL. */
  const crumbs = [{ name: "Embarko", item: SITE }];
  if (meta.path !== "/docs") crumbs.push({ name: "Documentation", item: `${SITE}/docs` });
  crumbs.push({ name: meta.title, item: `${SITE}${meta.path}` });
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <DocView markdown={markdown} toc={extractToc(markdown)} activeSlug={slug} />
    </>
  );
}

export function docMetadata(slug: string): Metadata {
  const meta = docBySlug(slug);
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
  };
}
