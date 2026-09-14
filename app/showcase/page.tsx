import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { COPIED_LABEL, CopyPromptButton } from "../components/CopyPromptButton";
import { listApps, listIndexableCollections } from "../lib/showcase";
import { AppCard, AppPreview, BTN_GHOST, BTN_PRIMARY, Creator, LABEL, PromptSteps, WRAP } from "./kit";

export const metadata: Metadata = {
  title: "Showcase — See what people are building",
  description: "Apps built with AI. Hosted on Embarko.",
};

/* Rendered per request, not prerendered. These pages read D1, and the binding
   only exists inside a request — `getCloudflareContext()` throws during the
   build's static export, which fails the whole deploy rather than just this
   route. Caching belongs at the edge, not in a build artefact. */
export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  const apps = await listApps();
  const collections = await listIndexableCollections();

  /* The hero takes the first app, the next few get the large treatment, and
     the rest fill the gallery. One ordered list split three ways, so nothing
     can appear twice or go missing between sections. */
  const [hero, ...rest] = apps;
  const featured = rest.slice(0, 3);
  const discover = rest.slice(3);

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      {hero ? <Hero app={hero} /> : <EmptyHero />}

      {featured.length > 0 && (
        <section className="py-[88px] max-[720px]:py-[60px]">
          <div className={WRAP}>
            <h2 className="mb-[52px] text-[32px] font-semibold leading-tight tracking-[-0.015em]">
              Worth exploring.
            </h2>

            {/* Alternating rows, not a row of identical cards: three projects
                shown as three equal tiles reads as a directory listing, and the
                point is that each of these is somebody's thing. */}
            <div className="flex flex-col gap-16">
              {featured.map((app, i) => (
                <FeatureRow key={app.id} app={app} flipped={i % 2 === 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {discover.length > 0 && (
        <section className="py-[88px] max-[720px]:py-[60px]">
          <div className={WRAP}>
            <h2 className="mb-[52px] text-[32px] font-semibold leading-tight tracking-[-0.015em]">
              More things people made.
            </h2>
            <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
              {discover.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Only collections worth linking to. A collection with one app behind it
          is a thin page, so `indexable` gates this rather than listing every
          row in the table. */}
      {collections.length > 0 && (
        <section className="pb-[88px] max-[720px]:pb-[60px]">
          <div className={WRAP}>
            <p className={`${LABEL} mb-4`}>Collections</p>
            <div className="flex flex-wrap gap-2.5">
              {collections.map((c) => (
                <Link
                  key={c.path}
                  href={`/showcase/${c.path}`}
                  className="rounded-[8px] border border-border px-3.5 py-2 text-[13.5px] text-muted-foreground transition hover:border-[var(--line-strong)] hover:text-foreground"
                >
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCta hasApps={apps.length > 0} />
      <SiteFooter />
    </main>
  );
}

function Hero({ app }: { app: Awaited<ReturnType<typeof listApps>>[number] }) {
  return (
    <header className="py-[88px] max-[900px]:py-14">
      <div className={WRAP}>
        <h1 className="max-w-[620px] text-[52px] font-semibold leading-[1.08] tracking-[-0.02em] max-[900px]:text-[38px] max-[420px]:text-[32px]">
          See what people are building.
        </h1>
        <p className="mt-5 text-[17px] text-muted-foreground">
          Apps built with AI. Hosted on Embarko.
        </p>

        {/* The featured app, given the whole width. The visitor should be
            looking at somebody's work before they read anything about us. */}
        <div className="mt-12">
          <Link href={`/showcase/apps/${app.slug}`} className="group block">
            <AppPreview app={app} className="aspect-[21/9] max-[720px]:aspect-[4/3]" />
          </Link>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <h2 className="text-[26px] font-semibold leading-tight">{app.name}</h2>
              <p className="mt-2 max-w-[560px] text-[16px] leading-[1.6] text-muted-foreground">
                {app.tagline}
              </p>
              <p className="mt-3 text-[14px]">
                by <Creator app={app} />
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a href={app.appUrl} target="_blank" rel="noreferrer" className={BTN_PRIMARY}>
                Open app
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link href="/showcase/submit" className={BTN_GHOST}>
                Submit your app
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Nothing approved yet.
 *
 * Still leads with the headline and the submit action rather than apologising:
 * the first person to read this page is the most likely person to fill it.
 */
function EmptyHero() {
  return (
    <header className="py-[88px] max-[900px]:py-14">
      <div className={WRAP}>
        <h1 className="max-w-[620px] text-[52px] font-semibold leading-[1.08] tracking-[-0.02em] max-[900px]:text-[38px] max-[420px]:text-[32px]">
          See what people are building.
        </h1>
        <p className="mt-5 text-[17px] text-muted-foreground">
          Apps built with AI. Hosted on Embarko.
        </p>
        <div className="mt-10 rounded-[14px] border border-dashed border-border px-8 py-16 text-center">
          <p className="text-[17px] font-medium">The first projects are on their way.</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
            If you have built something and put it online with Embarko, it belongs here.
          </p>
          <Link href="/showcase/submit" className={`${BTN_PRIMARY} mt-7`}>
            Submit your app
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureRow({
  app,
  flipped,
}: {
  app: Awaited<ReturnType<typeof listApps>>[number];
  flipped: boolean;
}) {
  return (
    <div className="grid grid-cols-[1.15fr_0.85fr] items-center gap-12 max-[820px]:grid-cols-1 max-[820px]:gap-6">
      <Link
        href={`/showcase/apps/${app.slug}`}
        className={`group block ${flipped ? "order-2 max-[820px]:order-none" : ""}`}
      >
        <AppPreview app={app} className="aspect-[16/10]" />
      </Link>

      <div className={flipped ? "order-1 max-[820px]:order-none" : ""}>
        {app.category && <p className={`${LABEL} mb-3`}>{app.category}</p>}
        <h3 className="text-[24px] font-semibold leading-tight">{app.name}</h3>
        <p className="mt-2.5 text-[15.5px] leading-[1.6] text-muted-foreground">{app.tagline}</p>
        <p className="mt-3.5 text-[13.5px]">
          by <Creator app={app} />
          {/* Kept quiet: which tool built it is interesting, not the headline. */}
          {app.builtWith && (
            <span className="text-muted-foreground"> · built with {app.builtWith}</span>
          )}
        </p>
        <a
          href={app.appUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-muted-foreground"
        >
          Open
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

/**
 * The two endings, in the order the spec asks for: submit what you made, then
 * go make something. The second half is the same copy-prompt block the home
 * page closes on, so the two pages rhyme.
 */
function FinalCta({ hasApps }: { hasApps: boolean }) {
  return (
    <section className="pb-20 pt-24">
      <div className={WRAP}>
        {hasApps && (
          <div className="mb-16 border-b border-border pb-16">
            <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.015em]">
              Built something worth sharing?
            </h2>
            <Link href="/showcase/submit" className={`${BTN_GHOST} mt-6`}>
              Submit your app
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}

        <h2 className="max-w-[640px] text-[38px] font-semibold leading-[1.15] tracking-[-0.02em] max-[600px]:text-[28px]">
          Want to build something new?
        </h2>
        <div className="mt-8">
          <CopyPromptButton className={BTN_PRIMARY} copiedChildren={COPIED_LABEL}>
            <Copy aria-hidden="true" className="h-4 w-4" />
            Copy the Embarko prompt
          </CopyPromptButton>
          <PromptSteps />
        </div>
      </div>
    </section>
  );
}
