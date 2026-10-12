import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { CtaSection } from "../../components/ds";
import { extractFaq, formatDate, POSTS, postBySlug, splitPost } from "../../lib/blog";
import { extractToc } from "../../lib/docs";
import { SITE } from "../../lib/site";
import { BlogArticle } from "../BlogArticle";
import { ContinueReading } from "../ContinueReading";

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

  const url = `${SITE}/blog/${post.slug}`;
  const faq = extractFaq(post.body);
  const parts = splitPost(post.body);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Embarko", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/blog` },
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
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Embarko", url: SITE },
  };
  const faqPage = faq.length
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
      {[breadcrumbs, article, faqPage].filter(Boolean).map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-6 py-12">
        <Link
          href="/blog"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Guides
        </Link>

        {/* Header laid out like the Showcase app page: what it is on the
            left, the picture on the right, stacked on small screens. */}
        <header className="mt-6 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-neutral-950 [text-wrap:balance] sm:text-5xl">
              {parts.heading ?? post.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-neutral-600">{post.description}</p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600">
              <span>
                <span className="font-[family-name:var(--ds-serif)] text-base italic">by</span>{" "}
                <b className="font-semibold text-neutral-950">{post.author}</b>
              </span>
              <span aria-hidden="true">·</span>
              <span>{post.readMinutes} min read</span>
              <span aria-hidden="true">·</span>
              <span>
                Updated <time dateTime={post.dateModified}>{formatDate(post.dateModified)}</time>
              </span>
            </p>
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

      <ContinueReading current={post.slug} />

      <CtaSection />
      <SiteFooter />
    </main>
  );
}
