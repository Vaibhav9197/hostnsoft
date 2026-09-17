import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../../components/SiteHeader";
import { SiteFooter } from "../../../components/SiteFooter";
import { getApp } from "../../../lib/showcase";
import { AppPreview, BTN_GHOST, BTN_PRIMARY, Creator, LABEL, WRAP } from "../../kit";
import { ShareRow } from "../../share";

/* Rendered per request, not prerendered. These pages read D1, and the binding
   only exists inside a request — `getCloudflareContext()` throws during the
   build's static export, which fails the whole deploy rather than just this
   route. Caching belongs at the edge, not in a build artefact. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const app = await getApp(slug);
  if (!app) return {};
  return {
    title: `${app.name} — Showcase`,
    description: app.tagline,
    openGraph: {
      title: app.name,
      description: app.tagline,
      /* The creator's own screenshot when there is one. No generated fallback
         card yet, so the site's default image stands in rather than a broken
         reference. */
      images: app.screenshotUrl ? [app.screenshotUrl] : undefined,
    },
  };
}

export default async function ShowcaseAppPage({ params }: Props) {
  const { slug } = await params;
  const app = await getApp(slug);
  /* Hidden listings 404 like unknown ones. */
  if (!app) notFound();

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <article className="py-[72px] max-[900px]:py-12">
        <div className={WRAP}>
          <Link
            href="/showcase"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Showcase
          </Link>

          <h1 className="mt-6 text-[42px] font-semibold leading-[1.1] tracking-[-0.02em] max-[900px]:text-[32px]">
            {app.name}
          </h1>
          <p className="mt-4 max-w-[640px] text-[18px] leading-[1.55] text-muted-foreground">
            {app.tagline}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={app.appUrl} target="_blank" rel="noreferrer" className={BTN_PRIMARY}>
              Open app
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <ShareRow title={`${app.name} — ${app.tagline}`} />
          </div>

          <AppPreview app={app} className="mt-12 aspect-[16/9] max-[720px]:aspect-[4/3]" />

          {/* Kept short on purpose — this is a page about an app, not a case
              study. Each block only renders when the creator wrote one. */}
          <div className="mt-16 grid grid-cols-[1fr_260px] gap-16 max-[820px]:grid-cols-1 max-[820px]:gap-10">
            <div className="min-w-0 space-y-10">
              {app.whatItDoes && (
                <section>
                  <h2 className="text-[19px] font-semibold">What it does</h2>
                  <p className="mt-3 max-w-[60ch] text-[15.5px] leading-[1.65] text-muted-foreground">
                    {app.whatItDoes}
                  </p>
                </section>
              )}

              {app.whyBuilt && (
                <section>
                  <h2 className="text-[19px] font-semibold">Why it was built</h2>
                  <p className="mt-3 max-w-[60ch] text-[15.5px] leading-[1.65] text-muted-foreground">
                    {app.whyBuilt}
                  </p>
                </section>
              )}
            </div>

            <aside className="space-y-7 text-[14px]">
              <div>
                <p className={LABEL}>Created by</p>
                <p className="mt-1.5">
                  <Creator app={app} />
                </p>
              </div>

              {app.builtWith && (
                <div>
                  <p className={LABEL}>Built with</p>
                  <p className="mt-1.5 text-muted-foreground">{app.builtWith}</p>
                </div>
              )}

              {app.category && (
                <div>
                  <p className={LABEL}>Category</p>
                  <p className="mt-1.5 text-muted-foreground">{app.category}</p>
                </div>
              )}

              {app.tags.length > 0 && (
                <div>
                  <p className={LABEL}>Tags</p>
                  {/* Text, not links. A tag only becomes a page once there is
                      enough behind it to be worth one. */}
                  <p className="mt-1.5 text-muted-foreground">{app.tags.join(" · ")}</p>
                </div>
              )}

              {app.collection && (
                <div>
                  <p className={LABEL}>Part of</p>
                  <p className="mt-1.5">
                    <Link
                      href={`/showcase/${app.collection.slug}`}
                      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      {app.collection.title}
                    </Link>
                  </p>
                </div>
              )}

              <div>
                <p className={LABEL}>Hosted on</p>
                <p className="mt-1.5 text-muted-foreground">Embarko</p>
              </div>
            </aside>
          </div>

          <div className="mt-20 border-t border-border pt-12">
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.015em]">
              Build something of your own.
            </h2>
            <Link href="/showcase" className={`${BTN_GHOST} mt-6`}>
              See more Showcase apps
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
