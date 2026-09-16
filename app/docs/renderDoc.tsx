import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "./DocView";
import { docBySlug, docMarkdown, extractToc } from "../lib/docs";

/**
 * Shared body for every published-doc route. The markdown is bundled from
 * content/docs/, so this does no IO and can't fail at request time — an
 * unknown slug is the only way through to notFound().
 */
export function renderDoc(slug: string) {
  const meta = docBySlug(slug);
  const markdown = docMarkdown(slug);
  if (!meta || markdown === undefined) notFound();

  return <DocView markdown={markdown} toc={extractToc(markdown)} activeSlug={slug} />;
}

export function docMetadata(slug: string): Metadata {
  const meta = docBySlug(slug);
  if (!meta) return {};
  return {
    title: `${meta.title} — Embarko`,
    description: meta.description,
  };
}
