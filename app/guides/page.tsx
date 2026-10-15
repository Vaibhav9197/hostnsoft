import type { Metadata } from "next";

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { CtaSection, Serif } from "../components/ds";
import { formatDate, POSTS } from "../lib/guides";
import { initials } from "./ContinueReading";
import { GuidesIndex } from "./GuidesIndex";
import { SITE } from "../lib/site";

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
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Embarko", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <SiteHeader />

      {/* A blog index, not a landing page: a short heading, then the guides
          start on the first screen. */}
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-16">
        <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pb-2">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-muted-foreground">Embarko guides</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl">
              From localhost to <Serif>live</Serif>.
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              Step-by-step guides for putting an AI-built app online, and for fixing it when a deploy breaks.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {POSTS.length} guides ·{" "}
            <a href="/guides/llms.txt" className="font-mono text-foreground underline underline-offset-4">
              llms.txt
            </a>
          </p>
        </header>

        <h2 id="posts-h" className="sr-only">
          All guides
        </h2>

        <GuidesIndex
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

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Reading as an AI agent? Every guide is plain markdown at{" "}
          <a href="/guides/llms.txt" className="font-mono text-foreground underline underline-offset-4">
            /guides/llms.txt
          </a>
          .
        </p>

        {POSTS.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">The first guides are on their way.</p>
        )}
      </div>

      <CtaSection />
      <SiteFooter />
    </main>
  );
}
