import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { COPIED_LABEL, CopyPromptButton } from "../components/CopyPromptButton";
import { listApps, listIndexableCollections } from "../lib/showcase";
import { BTN_GHOST, BTN_PRIMARY, PromptSteps, WRAP } from "./kit";
import { SearchGallery } from "./SearchGallery";

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

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <header className="py-[88px] max-[900px]:py-14">
        <div className={WRAP}>
          <h1 className="max-w-[620px] text-[52px] font-semibold leading-[1.08] tracking-[-0.02em] max-[900px]:text-[38px] max-[420px]:text-[32px]">
            See what people are building.
          </h1>
          <p className="mt-5 text-[17px] text-muted-foreground">
            Apps built with AI. Hosted on Embarko.
          </p>
        </div>
      </header>

      {apps.length > 0 ? (
        <SearchGallery apps={apps} collections={collections} />
      ) : (
        <EmptyState />
      )}

      <FinalCta hasApps={apps.length > 0} />
      <SiteFooter />
    </main>
  );
}

/** Nothing listed yet. Leads with the submit action, not an apology. */
function EmptyState() {
  return (
    <div className="pb-[88px] max-[900px]:pb-14">
      <div className={WRAP}>
        <div className="rounded-[14px] border border-dashed border-border px-8 py-16 text-center">
          <p className="text-[17px] font-medium">The first projects are on their way.</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
            If you have put something online with Embarko, list it from your console.
          </p>
          <Link href="/app/showcase/submit" className={`${BTN_PRIMARY} mt-7`}>
            List your app
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
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
            <Link href="/app/showcase/submit" className={`${BTN_GHOST} mt-6`}>
              List your app
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
