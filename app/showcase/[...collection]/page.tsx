import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { getCollection, listCollectionApps } from "../../lib/showcase";
import { AppCard, BTN_GHOST, BTN_PRIMARY, WRAP } from "../kit";
import { ShareRow } from "../share";

/**
 * Collection pages: /showcase/games, /showcase/claude,
 * /showcase/hackathons/iit-indore-2026, /showcase/colleges/iit-indore.
 *
 * A catch-all rather than a route per kind, because the shape of the page is
 * the same for all of them and only the membership rule differs. `/submit` and
 * `/apps/...` are real directories, so Next matches those first and they never
 * reach here.
 */

/* Rendered per request, not prerendered. These pages read D1, and the binding
   only exists inside a request — `getCloudflareContext()` throws during the
   build's static export, which fails the whole deploy rather than just this
   route. Caching belongs at the edge, not in a build artefact. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ collection: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  const found = await getCollection(collection.join("/"));
  if (!found) return {};

  const apps = await listCollectionApps(found);
  return {
    title: `${found.title} — Embarko Showcase`,
    description: found.intro ?? `${apps.length} projects built.`,
    /* The SEO rule, enforced rather than documented: a collection is only
       indexed once someone has marked it worth indexing. Everything else
       exists, works and can be shared — search engines are just asked to leave
       it alone, which is what keeps this from becoming thousands of thin
       pages. */
    robots: found.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { collection } = await params;
  const found = await getCollection(collection.join("/"));
  if (!found) notFound();

  const apps = await listCollectionApps(found);

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
            {found.title}
          </h1>
          <p className="mt-4 text-[17px] text-muted-foreground">
            {apps.length} {apps.length === 1 ? "project" : "projects"} built
          </p>

          {found.intro && (
            <p className="mt-5 max-w-[62ch] text-[15.5px] leading-[1.65] text-muted-foreground">
              {found.intro}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/showcase/submit" className={BTN_PRIMARY}>
              Submit your project
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <ShareRow title={`${found.title} — ${apps.length} projects built`} />
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
            /* A collection can exist before anything is in it — a hackathon
               page is created with the event, and the projects arrive over the
               following days. It says so rather than looking broken. */
            <div className="rounded-[14px] border border-dashed border-border px-8 py-16 text-center">
              <p className="text-[17px] font-medium">Nothing here yet.</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
                Projects appear here once they have been submitted and reviewed.
              </p>
              <Link href="/showcase/submit" className={`${BTN_GHOST} mt-7`}>
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
