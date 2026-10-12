import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { Card, CtaSection, Hero, Section, Serif } from "../components/ds";
import { formatDate, POSTS } from "../lib/blog";
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
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/blog` },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <SiteHeader />

      <Hero
        eyebrow="Embarko guides"
        title={
          <>
            From localhost
            <br />
            to <Serif>live</Serif>.
          </>
        }
        sub="Step-by-step guides for putting an AI-built app online, and for fixing it when a deploy breaks."
      />

      <Section labelledBy="posts-h">
        <h2 id="posts-h" className="sr-only">
          All guides
        </h2>
        {/* Newest post full width, the rest two per row from md up. */}
        <ul className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {POSTS.map((post, i) => (
            <Card as="li" lift key={post.slug} className={i === 0 ? "!p-0 md:col-span-2" : "!p-0"}>
              {/* The featured card sits image-beside-text from md up, so it reads
                  as the lead story without being a screen tall. */}
              <Link
                href={`/blog/${post.slug}`}
                className={`block overflow-hidden rounded-[inherit] ${i === 0 ? "md:grid md:grid-cols-[1.2fr_1fr] md:items-center" : ""}`}
              >
                {post.cover && (
                  <img
                    src={post.cover}
                    alt={post.coverAlt}
                    width={1200}
                    height={630}
                    loading={i === 0 ? "eager" : "lazy"}
                    className={`aspect-[1200/630] w-full border-b border-border object-cover ${i === 0 ? "md:h-full md:border-b-0 md:border-r" : ""}`}
                  />
                )}
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">{post.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>
                      {formatDate(post.datePublished)} · {post.readMinutes} min read
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      Read the guide
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </ul>
        {POSTS.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">The first guides are on their way.</p>
        )}
      </Section>

      <CtaSection />
      <SiteFooter />
    </main>
  );
}
