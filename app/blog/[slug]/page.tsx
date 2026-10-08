import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { CtaSection } from "../../components/ds";
import { extractFaq, POSTS, postBySlug, splitPost } from "../../lib/blog";
import { extractToc } from "../../lib/docs";
import { SITE } from "../../lib/site";
import { BlogArticle } from "../BlogArticle";

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
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const url = `${SITE}/blog/${post.slug}`;
  const faq = extractFaq(post.body);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Embarko", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
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
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All posts
        </Link>

        <BlogArticle
          parts={splitPost(post.body)}
          toc={extractToc(post.body).filter((t) => t.level === 2)}
          category={post.category}
          readMinutes={post.readMinutes}
          dateModified={post.dateModified}
          author={post.author}
          aiDisclosure={post.aiDisclosure}
        />
      </div>

      <CtaSection />
      <SiteFooter />
    </main>
  );
}
