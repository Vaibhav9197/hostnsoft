import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { Card, CtaSection, Hero, Pill, Section, Serif } from "../components/ds";
import { formatDate, POSTS } from "../lib/blog";
import { SITE } from "../lib/site";

export const metadata: Metadata = {
  title: "Blog — Guides for putting AI-built apps online",
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
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <SiteHeader />

      <Hero
        eyebrow="The Embarko blog"
        title={
          <>
            Guides for apps your
            <br />
            AI <Serif>built</Serif>.
          </>
        }
        sub="How to put an AI-built app online, and what to do when something breaks."
      />

      <Section labelledBy="posts-h">
        <h2 id="posts-h" className="sr-only">
          All posts
        </h2>
        <ul className="mx-auto grid max-w-3xl gap-5">
          {POSTS.map((post) => (
            <Card as="li" lift key={post.slug} className="p-0">
              <Link href={`/blog/${post.slug}`} className="block rounded-[inherit] p-6 sm:p-8">
                <Pill>{post.category}</Pill>
                <h3 className="mt-4 text-xl font-semibold leading-snug text-foreground sm:text-2xl">{post.title}</h3>
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
