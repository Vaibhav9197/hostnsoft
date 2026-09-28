import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { listAppsWithTag } from "../../../lib/showcase";
import { ListPage } from "../../ListPage";
import { ShareRow } from "../../share";
import { ShowcaseBreadcrumbs } from "../../breadcrumbs";

/**
 * A tag page: /showcase/tag/education. Every public app carrying that tag.
 * Tags are free text, so any slug resolves: a tag no app carries renders an
 * empty state (and asks search engines not to index it) instead of a 404.
 * `/tag/...` is a real directory so it matches before the catch-all.
 */

/* Per request, not prerendered: a build-time page would freeze the list. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { tag, apps } = await listAppsWithTag(slug);

  return {
    title: `${tag} apps — Showcase`,
    description: `Apps tagged "${tag}", built with AI agents and hosted on Embarko. Browse ${apps.length} ${apps.length === 1 ? "project" : "projects"} and try them live.`,
    keywords: [`${tag.toLowerCase()} apps`, tag, "AI-built apps", "Embarko showcase"],
    /* An unused tag is a thin page. It resolves, so links to it never break —
       search engines are just asked to wait. */
    robots: apps.length > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const { tag, apps } = await listAppsWithTag(slug);
  const count = `${apps.length} ${apps.length === 1 ? "app" : "apps"}`;

  return (
    <>
      <ShowcaseBreadcrumbs trail={[{ name: tag, path: `/showcase/tag/${slug}` }]} />
      <ListPage
        title={`#${tag}`}
        lede={`${count} with this tag`}
        apps={apps}
        actions={
          <>
            <Link href="/app/showcase/submit" className="sc-btn pri">
              List your app here <ArrowRight aria-hidden="true" />
            </Link>
            <ShareRow title={`${tag} apps — ${count} on Embarko Showcase`} />
          </>
        }
        empty={{
          title: "No apps yet.",
          body: `No apps tagged \u201c${tag}\u201d have been listed so far. Yours could be the first.`,
          action: (
            <Link href="/app/showcase/submit" className="sc-btn">
              List your app
            </Link>
          ),
        }}
      />
    </>
  );
}
