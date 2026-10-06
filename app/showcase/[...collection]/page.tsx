import { showcaseListPrompt } from "../../lib/showcasePrompt";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCollectionWithApps } from "../../lib/showcase";
import { ListPage } from "../ListPage";
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

  return (
    <>
      <ShowcaseBreadcrumbs trail={[{ name: meta.title, path: `/showcase/${encodeURIComponent(meta.slug)}` }]} />
      <ListPage
        title={meta.title}
        /* None on an event page: anyone can ask to list an app there, so
           "Apps built by <page>" would claim authorship it doesn't have. Its
           intro and the note below say what the page is. */
        lede={meta.type === "event" ? undefined : `A showcase page — ${count} built and shared here`}
        intro={meta.intro}
        /* An event page exists to collect apps, so it says how right away:
           the button copies a prompt that lists the visitor's app here. */
        note={
          meta.type === "event"
            ? "Built something for this showcase? Click “List your app here” at the top, paste the prompt into your AI, and your app appears on this page."
            : null
        }
        apps={apps}
        /* Only an event page takes anyone's app; a company page takes that
           company's own, which it lists from its console. */
        listPrompt={meta.type === "event" ? showcaseListPrompt(meta) : null}
        shareTitle={meta.type === "event" ? `${meta.title} — list your AI-built app on Embarko` : `${meta.title} — ${count} built with AI`}
        shareWhenEmpty={meta.type === "event"}
        /* A collection can exist before anything is in it — it is created
           with the event, and the projects arrive over the following days. */
        empty={{
          title: "No apps here yet.",
          body:
            meta.type === "event"
              ? "Be the first one to showcase your app here."
              : `Apps appear here as soon as ${meta.title} lists them.`,
          /* The same button already sits in the hero just above. */
          action: null,
        }}
      />
    </>
  );
}
