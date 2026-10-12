import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { Card, CtaSection, Hero, Section, Serif } from "../components/ds";
import { formatDate, POSTS, type BlogPost } from "../lib/guides";
import { initials } from "./ContinueReading";
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

/* The cover, cropped to the share-image ratio. It zooms a little on hover of
   its card; motion-safe keeps it still for anyone who turned motion off. */
function Cover({ post, eager, className = "" }: { post: BlogPost; eager?: boolean; className?: string }) {
  if (!post.cover) return null;
  return (
    <div className={`overflow-hidden border-b border-border ${className}`}>
      <img
        src={post.cover}
        alt={post.coverAlt}
        width={1200}
        height={630}
        loading={eager ? "eager" : "lazy"}
        className="aspect-[1200/630] h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
      />
    </div>
  );
}

/* Author, date and read time on one line, with an arrow that moves on hover
   to say the whole card is the link. */
function Byline({ post, className = "" }: { post: BlogPost; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-sm text-muted-foreground ${className}`}>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-[11px] font-semibold text-foreground"
      >
        {initials(post.author)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{post.author}</span>
        <span className="block">
          <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time> · {post.readMinutes} min read
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="ml-auto size-5 shrink-0 text-foreground transition-transform duration-200 motion-safe:group-hover:translate-x-1"
      />
    </div>
  );
}

export default function BlogIndexPage() {
  const [featured, ...rest] = POSTS;
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

        {featured && (
          <Card as="article" lift className="group mx-auto max-w-6xl !p-0">
            <Link
              href={`/guides/${featured.slug}`}
              className="grid overflow-hidden rounded-[inherit] lg:grid-cols-[1.25fr_1fr] lg:items-stretch"
            >
              <Cover post={featured} eager className="lg:h-full lg:border-b-0 lg:border-r" />
              <div className="flex flex-col p-7 sm:p-9">
                <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">Newest guide</p>
                <h3 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground [text-wrap:balance] sm:text-3xl">
                  {featured.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{featured.description}</p>
                <Byline post={featured} className="mt-auto pt-7" />
              </div>
            </Link>
          </Card>
        )}

        {rest.length > 0 && (
          <ul className="mx-auto mt-6 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Card as="li" lift key={post.slug} className="group !p-0">
                <Link href={`/guides/${post.slug}`} className="flex h-full flex-col overflow-hidden rounded-[inherit]">
                  <Cover post={post} />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.01em] text-foreground">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                    <Byline post={post} className="mt-auto pt-6" />
                  </div>
                </Link>
              </Card>
            ))}
          </ul>
        )}

        <p className="mx-auto mt-10 max-w-6xl text-center text-sm text-muted-foreground">
          Reading as an AI agent? Every guide is plain markdown at{" "}
          <a href="/guides/llms.txt" className="font-mono text-foreground underline underline-offset-4">
            /guides/llms.txt
          </a>
          .
        </p>

        {POSTS.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">The first guides are on their way.</p>
        )}
      </Section>

      <CtaSection />
      <SiteFooter />
    </main>
  );
}
