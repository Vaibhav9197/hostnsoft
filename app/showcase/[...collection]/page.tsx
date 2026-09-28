import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { getCollectionWithApps } from "../../lib/showcase";
import { ListPage } from "../ListPage";
import { ShareRow } from "../share";
import { ShowcaseBreadcrumbs } from "../breadcrumbs";

/**
 * A showcase page: /showcase/walkover, /showcase/iit-indore-26. A company's
 * own page or an event page. `/app/...` is a real directory and matches
 * first. A catch-all so deeper paths 404 in this layout.
 */

/* Per request, not prerendered: a build-time page would freeze the list. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ collection: string[] }>;
}

async function load(segments: string[]) {
  /* Pages are one segment deep. */
  if (segments.length !== 1) return null;
  return getCollectionWithApps(segments[0]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  const found = await load(collection);
  if (!found) return {};

  return {
    title: `${found.collection.title} — Showcase`,
    description:
      found.collection.intro ??
      `${found.apps.length} ${found.apps.length === 1 ? "app" : "apps"} built with AI and hosted on Embarko, collected on the ${found.collection.title} showcase.`,
    keywords: [found.collection.title, `${found.collection.title} apps`, "apps built with AI", "Embarko showcase"],
    /* A page with nothing on it yet is a thin page. It exists, works and can
       be shared — search engines are just asked to wait until there is
       something to index. */
    robots: found.apps.length > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { collection } = await params;
  const found = await load(collection);
  if (!found) notFound();

  const { collection: meta, apps } = found;
  const count = `${apps.length} ${apps.length === 1 ? "app" : "apps"}`;
  const submitHref = `/app/showcase/submit?page=${encodeURIComponent(meta.slug)}`;

  return (
    <>
      <ShowcaseBreadcrumbs trail={[{ name: meta.title, path: `/showcase/${encodeURIComponent(meta.slug)}` }]} />
      <ListPage
        title={meta.title}
        /* Says which kind of page this is, so a visitor who landed here from
           a share link knows what they are looking at. */
        lede={meta.type === "company" ? `Apps built by ${meta.title}` : `An event page — ${count} built and shared here`}
        intro={meta.intro}
        apps={apps}
        /* Only an event page takes anyone's app; a company page takes that
           company's own, which it lists from its console. */
        listHref={meta.type === "public" ? submitHref : null}
        actions={
          <>
            {meta.type === "public" ? (
              <Link href={submitHref} className="sc-btn pri">
                Add your app to this page <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <Link href="/showcase" className="sc-btn">
                Browse the Showcase <ArrowRight aria-hidden="true" />
              </Link>
            )}
            <ShareRow title={`${meta.title} — ${count} built with AI`} />
          </>
        }
        /* A collection can exist before anything is in it — it is created
           with the event, and the projects arrive over the following days. */
        empty={{
          title: "No apps here yet.",
          body:
            meta.type === "public"
              ? "Apps appear here as soon as participants add them."
              : `Apps appear here as soon as ${meta.title} lists them.`,
          action:
            meta.type === "public" ? (
              <Link href={submitHref} className="sc-btn">
                Be the first
              </Link>
            ) : undefined,
        }}
      />
    </>
  );
}
