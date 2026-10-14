import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "./DocView";
import { extractToc } from "../lib/docs";
import { RESERVED_NAMES, findTopic, pageKeywords, pageMarkdown } from "../lib/guide/site";
import { jsonLd } from "../lib/guide/discovery";
import { SITE } from "../lib/site";
import hackathonsMd from "../../content/docs/hackathons.md";

const GUIDE = "Agent guide";

function pageTitle(slug: string): string | undefined {
  if (slug === RESERVED_NAMES) return "Reserved app names";
  return findTopic(slug)?.title;
}

/**
 * One page of the agent guide. The Markdown is built from the bundled guide,
 * so this does no IO and can't fail at request time — an unknown slug is the
 * only way through to notFound().
 *
 * `home` is /docs itself, which opens on the quickstart: that is the page
 * most readers came for, and the sidebar is the contents.
 */
export function renderGuidePage(slug: string, { home = false }: { home?: boolean } = {}) {
  const markdown = pageMarkdown(slug);
  const title = pageTitle(slug);
  if (markdown === undefined || !title) notFound();

  /* Tells Google where this page sits in the site, so results can show
     "Embarko › Agent guide › Own domain" instead of a bare URL. */
  const crumbs = [
    { name: "Embarko", item: SITE },
    { name: GUIDE, item: `${SITE}/docs` },
  ];
  if (!home) crumbs.push({ name: title, item: `${SITE}/docs/${slug}` });
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {home && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(SITE)) }} />}
      <DocView
        markdown={markdown}
        toc={extractToc(markdown)}
        activeSlug={slug}
        mdUrl={`/docs/${slug}.md`}
        jsonUrl={`/docs/${slug}.json`}
      />
    </>
  );
}

export function guideMetadata(slug: string): Metadata {
  const title = pageTitle(slug);
  if (!title) return {};
  const tp = findTopic(slug);
  return {
    title: `${title} · ${GUIDE}`,
    description: tp ? tp.summary.slice(0, 155).replace(/\s+\S*$/, "") + (tp.summary.length > 155 ? "…" : "") : "App names reserved for Embarko itself, and what to do when you hit one.",
    keywords: pageKeywords(slug),
    alternates: {
      /* Setting alternates replaces the layout's, so the canonical is restated.
         /docs opens on the quickstart, so the two are one page and /docs is
         the address to index; every other page is its own canonical. */
      canonical: slug === "quickstart" ? "/docs" : "./",
      types: { "text/markdown": `/docs/${slug}.md`, "application/json": `/docs/${slug}.json` },
    },
  };
}

/** The hackathons landing page: Markdown too, but not part of the guide. */
export function renderHackathons() {
  return <DocView markdown={hackathonsMd} toc={extractToc(hackathonsMd)} activeSlug="hackathons" intro={false} />;
}
