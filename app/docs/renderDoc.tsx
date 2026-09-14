import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "./DocView";
import { docBySlug, extractToc, fetchDoc } from "../lib/docs";

/**
 * Shared body for every published-doc route. Each route is a server component
 * on purpose: the docs endpoints only allow CORS from embarko.ai, so the
 * markdown has to be fetched here rather than in the browser.
 */
export async function renderDoc(slug: string) {
  const meta = docBySlug(slug);
  if (!meta) notFound();

  const markdown = await fetchDoc(slug);
  const toc = markdown ? extractToc(markdown) : [];

  return <DocView markdown={markdown} toc={toc} activeSlug={slug} />;
}

export function docMetadata(slug: string): Metadata {
  const meta = docBySlug(slug);
  if (!meta) return {};
  return {
    title: `${meta.title} — Embarko`,
    description: meta.description,
  };
}
