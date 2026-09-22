import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { getCollectionWithApps } from "../../lib/showcase";
import { AppCard, BTN_GHOST, BTN_PRIMARY, WRAP } from "../kit";
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

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <ShowcaseBreadcrumbs trail={[{ name: meta.title, path: `/showcase/${encodeURIComponent(meta.slug)}` }]} />
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
          {/* Says which kind of page this is, so a visitor who landed here
              from a share link knows what they are looking at. */}
          <p className="mt-4 text-[17px] text-muted-foreground">
            {meta.type === "company"
              ? `Apps built by ${meta.title}`
              : `An event page — ${apps.length} ${apps.length === 1 ? "app" : "apps"} built and shared here`}
          </p>

          {meta.intro && (
            <p className="mt-5 max-w-[62ch] text-[15.5px] leading-[1.65] text-muted-foreground">
              {meta.intro}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {/* Only an event page takes anyone's app; a company page takes
                that company's own, which it lists from its console. */}
            {meta.type === "public" ? (
              <Link href={`/app/showcase/submit?page=${encodeURIComponent(meta.slug)}`} className={BTN_PRIMARY}>
                Add your app to this page
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/showcase" className={BTN_GHOST}>
                Browse the Showcase
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            <ShareRow title={`${meta.title} — ${apps.length} ${apps.length === 1 ? "app" : "apps"} built with AI`} />
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
              <p className="text-[17px] font-medium">No apps here yet.</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
                {meta.type === "public"
                  ? "Apps appear here as soon as participants add them."
                  : `Apps appear here as soon as ${meta.title} lists them.`}
              </p>
              {meta.type === "public" && (
                <Link href={`/app/showcase/submit?page=${encodeURIComponent(meta.slug)}`} className={`${BTN_GHOST} mt-7`}>
                  Be the first
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
