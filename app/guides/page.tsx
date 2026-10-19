import type { Metadata } from "next";

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { formatDate, POSTS } from "../lib/guides";
import { SITE } from "../lib/site";
import { initials } from "./ContinueReading";
import { GuidesDeck } from "./GuidesDeck";
import { CATEGORIES, DECK, DEFAULT_ENTRY } from "./_deck/meta";

export const metadata: Metadata = {
  title: "Guides — Put your AI-built app online",
  description: "Plain-language guides to deploying, fixing and running the apps your AI agent builds.",
  keywords: [
    "deploy AI built app",
    "host vibe coded app",
    "deploy app without github",
    "AI agent app hosting guides",
  ],
};

export default function BlogIndexPage() {
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Embarko", item: SITE },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
        ],
      },
      {
        "@type": "CollectionPage",
        name: "Guides — Put your AI-built app online",
        description: "Plain-language guides to deploying, fixing and running the apps your AI agent builds.",
        url: `${SITE}/guides`,
        hasPart: POSTS.map((p) => ({
          "@type": "TechArticle",
          headline: p.title,
          description: p.description,
          url: `${SITE}/guides/${p.slug}`,
          datePublished: p.datePublished,
          dateModified: p.dateModified,
          articleSection: CATEGORIES.find((c) => c.id === (DECK[p.slug] ?? DEFAULT_ENTRY).category)?.label,
          author: { "@type": /team|embarko/i.test(p.author) ? "Organization" : "Person", name: p.author },
          publisher: { "@type": "Organization", name: "Embarko", url: SITE },
        })),
      },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SiteHeader />
      <GuidesDeck
        posts={POSTS.map((p) => ({
          slug: p.slug,
          title: p.title,
          description: p.description,
          author: p.author,
          initials: initials(p.author),
          date: p.datePublished,
          dateLabel: formatDate(p.datePublished),
          readMinutes: p.readMinutes,
        }))}
      />
      <SiteFooter />
    </main>
  );
}
