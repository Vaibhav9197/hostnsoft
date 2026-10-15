import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { CtaSection, PrimaryCta } from "../../components/ds";
import { extractFaq, formatDate, POSTS, postBySlug, splitPost } from "../../lib/guides";
import { extractToc } from "../../lib/docs";
import { SITE } from "../../lib/site";
import { BlogArticle } from "../BlogArticle";
import { BlogShare } from "../BlogShare";
import { InteractiveGuide } from "../_interactive/InteractiveGuide";
import { INTERACTIVE_GUIDES } from "../_interactive/registry";
import { ContinueReading, initials } from "../ContinueReading";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      ...(post.cover ? { images: [{ url: post.cover, width: 1200, height: 630, alt: post.coverAlt }] } : {}),
    },
    ...(post.cover ? { twitter: { card: "summary_large_image" as const, images: [post.cover] } } : {}),
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const url = `${SITE}/guides/${post.slug}`;
  const faq = extractFaq(post.body);
  const parts = splitPost(post.body);
  /* Guides with their own interactive design (header, scenes, steps, FAQ and
     the troubleshooting dialog) replace the standard article layout. Their
     HowTo and FAQPage schema come with the design, matching it word for word. */
  const interactive = INTERACTIVE_GUIDES[post.slug];
  const interactiveGuide = Boolean(interactive);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Embarko", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    mainEntityOfPage: url,
    ...(post.cover ? { image: `${SITE}${post.cover}` } : {}),
    /* "The Embarko team" is an organisation, not a person. */
    author: post.author.toLowerCase().endsWith(" team")
      ? { "@type": "Organization", name: post.author, url: SITE }
      : { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Embarko", url: SITE },
    inLanguage: "en",
    isAccessibleForFree: true,
    articleSection: post.category,
    keywords: post.keywords.join(", "),
    timeRequired: `PT${post.readMinutes}M`,
  };
  const faqPage = interactiveGuide
    ? null
    : faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      {[breadcrumbs, article, faqPage, ...(interactive ? interactive.schemas : [])].filter(Boolean).map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <SiteHeader />
      {/* Points agents and crawlers at the plain-markdown copy of this guide. */}
      <link rel="alternate" type="text/plain" href={`/guides/${post.slug}/llms.txt`} title="llms.txt for this page" />

      {interactive ? (
        <InteractiveGuide slug={post.slug} html={interactive.html} />
      ) : (
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* The same trail the BreadcrumbList schema describes, so what a
            reader sees and what a search engine reads agree. */}
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 text-sm text-neutral-600">
            <li>
              <Link href="/" className="inline-flex min-h-11 items-center hover:text-neutral-950 hover:underline">
                Embarko
              </Link>
            </li>
            <li aria-hidden="true" className="text-neutral-400">
              /
            </li>
            <li>
              <Link href="/guides" className="inline-flex min-h-11 items-center hover:text-neutral-950 hover:underline">
                Guides
              </Link>
            </li>
            <li aria-hidden="true" className="text-neutral-400">
              /
            </li>
            <li aria-current="page" className="max-w-[30ch] truncate font-medium text-neutral-950 sm:max-w-[48ch]">
              {post.title}
            </li>
          </ol>
        </nav>

        <header className="mt-4 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-500">{post.category}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] text-neutral-950 [text-wrap:balance] sm:text-5xl">
              {parts.heading ?? post.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-neutral-600">{post.description}</p>

            <div className="mt-6 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-neutral-300 bg-[var(--surface)] text-xs font-semibold text-neutral-950"
              >
                {initials(post.author)}
              </span>
              <p className="text-sm leading-snug text-neutral-600">
                <span className="block font-semibold text-neutral-950">{post.author}</span>
                <span>
                  Updated <time dateTime={post.dateModified}>{formatDate(post.dateModified)}</time> · {post.readMinutes} min read
                </span>
              </p>
            </div>

            {/* One primary action, as everywhere on the site; share and the
                agent-readable copy sit beside it. */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryCta size="md" glow={false} />
              <BlogShare title={post.title} />
              {/* The same guide as plain markdown for AI agents. A plain <a>:
                  it is a text file, not a page Link should route. */}
              <a
                href={`/guides/${post.slug}/llms.txt`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-950 px-5 text-sm font-bold text-neutral-950 transition-colors hover:bg-neutral-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              >
                <FileText className="size-4" aria-hidden="true" />
                llms.txt for this page
              </a>
            </div>
          </div>
          {post.cover && (
            <img
              src={post.cover}
              alt={post.coverAlt}
              width={1200}
              height={630}
              fetchPriority="high"
              className="aspect-[1200/630] w-full rounded-2xl border border-neutral-200 object-cover shadow-[0_2px_4px_rgba(11,11,15,.04),0_30px_70px_-20px_rgba(20,18,16,.16)]"
            />
          )}
        </header>

        <div className="mt-14 border-t border-neutral-200 pt-12">
          <BlogArticle
            parts={parts}
            toc={extractToc(post.body).filter((t) => t.level === 2)}
            title={post.title}
            author={post.author}
            datePublished={post.datePublished}
            dateModified={post.dateModified}
            readMinutes={post.readMinutes}
          />
        </div>
      </div>
      )}

      <ContinueReading current={post.slug} />

      <CtaSection />
      <SiteFooter />
    </main>
  );
}
