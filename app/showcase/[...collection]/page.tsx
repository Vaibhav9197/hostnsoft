import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { getCollectionWithApps } from "../../lib/showcase";
import { AppCard, BTN_GHOST, BTN_PRIMARY, WRAP } from "../kit";
import { ShareRow } from "../share";

/**
 * A showcase page: /showcase/walkover, /showcase/iit-indore-26. A company's
 * own page or a public board. `/apps/...` is a real directory and matches
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
    title: `${found.collection.title} — Embarko Showcase`,
    description: found.collection.intro ?? `${found.apps.length} projects built.`,
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

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <header className="py-[72px] max-[900px]:py-12">
        <div className={WRAP}>
          <Link
            href="/showcase"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Showcase
          </Link>

          <h1 className="mt-6 max-w-[720px] text-[42px] font-semibold leading-[1.1] tracking-[-0.02em] max-[900px]:text-[32px]">
            {meta.title}
          </h1>
          <p className="mt-4 text-[17px] text-muted-foreground">
            {apps.length} {apps.length === 1 ? "project" : "projects"} built
          </p>

          {meta.intro && (
            <p className="mt-5 max-w-[62ch] text-[15.5px] leading-[1.65] text-muted-foreground">
              {meta.intro}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/app/showcase/submit" className={BTN_PRIMARY}>
              List your app here
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <ShareRow title={`${meta.title} — ${apps.length} projects built`} />
          </div>
        </div>
      </header>

      <section className="pb-[88px] max-[720px]:pb-[60px]">
        <div className={WRAP}>
          {apps.length > 0 ? (
            <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            /* A collection can exist before anything is in it — it is created
               with the event, and the projects arrive over the following
               days. It says so rather than looking broken. */
            <div className="rounded-[14px] border border-dashed border-border px-8 py-16 text-center">
              <p className="text-[17px] font-medium">Nothing here yet.</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
                Apps appear here as soon as their owners list them from the Embarko console.
              </p>
              <Link href={`/app/showcase/submit?page=${encodeURIComponent(meta.slug)}`} className={`${BTN_GHOST} mt-7`}>
                Be the first
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
