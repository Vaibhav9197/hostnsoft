import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { guideMetadata, renderGuidePage } from "../renderDoc";
import { GUIDE_TOPICS, RESERVED_NAMES, aliasOf, findTopic } from "../../lib/guide/site";

/* Bundled content, nothing per request. A slug outside the list is rendered
   on demand only to redirect an alias ("domains" → custom-domain) or 404. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return [...GUIDE_TOPICS.map((t) => ({ slug: t.topic })), { slug: RESERVED_NAMES }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return guideMetadata(slug);
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== RESERVED_NAMES && !findTopic(slug)) {
    const alias = aliasOf(slug);
    if (alias) permanentRedirect(`/docs/${alias}`);
    notFound();
  }
  return renderGuidePage(slug);
}
