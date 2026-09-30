import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { COPIED_LABEL, CopyPromptButton } from "../components/CopyPromptButton";
import { listApps } from "../lib/showcase";
import { DeployCta, Steps } from "./kit";
import { SearchGallery } from "./SearchGallery";
import { Hero, PrimaryCta, Serif } from "../components/ds";
import { showcaseGeneralPrompt } from "../lib/showcasePrompt";

export const metadata: Metadata = {
  title: "Showcase — See what people are building with AI",
  keywords: ["apps built with AI","AI generated apps examples","vibe coded apps","Embarko showcase"],
  description:
    "Browse real apps people built with AI agents like Claude Code, Cursor and Codex, all live on Embarko. Open any of them, or list your own.",
};

/* Rendered per request, not prerendered. These pages read D1, and the binding
   only exists inside a request — `getCloudflareContext()` throws during the
   build's static export, which fails the whole deploy rather than just this
   route. Caching belongs at the edge, not in a build artefact. */
export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  /* The API's maximum, so the category counts cover every public app. */
  const apps = await listApps(200);

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <div className="sc-wrap sc-layer">
        <Hero
          chip={
            <Link href="/pages" className="sc-pages-chip">
              <span className="sc-pages-chip-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="sc-pages-chip-new">New</span>
              <span className="sc-pages-chip-text">
                <b>Create a page</b>
                <span className="sc-pages-chip-sub"> for your hackathon, class, event and more</span>
              </span>
              <ArrowRight aria-hidden="true" className="sc-pages-chip-arrow" />
            </Link>
          }
          title={
            <>
              <Serif grad>Hosted</Serif> on Embarko.
            </>
          }
          sub={
            <>
              Every app here was built by someone&rsquo;s own AI agent and put online with Embarko. Open
              one, then make your own.
            </>
          }
          actions={
            <PrimaryCta label="Copy prompt to showcase your app" text={showcaseGeneralPrompt()} />
          }
        />

        {apps.length > 0 ? (
          <SearchGallery apps={apps} />
        ) : (
          <EmptyState />
        )}

        <DeployCta />
      </div>
      <SiteFooter />
    </main>
  );
}

/** Nothing listed yet. Starts the job instead of apologising. */
function EmptyState() {
  return (
    <div className="sc-gal" id="explore">
      <div className="sc-empty">
        <h3>The first apps are on their way.</h3>
        <p>Deploy something with your AI, then list it here. It gets its own page.</p>
        <div className="acts">
          <CopyPromptButton className="sc-btn pri" copiedChildren={COPIED_LABEL}>
            <Copy aria-hidden="true" />
            Copy deployment prompt
          </CopyPromptButton>
          <CopyPromptButton className="sc-btn" text={showcaseGeneralPrompt()} copiedChildren={COPIED_LABEL}>
            Copy prompt to showcase your app
          </CopyPromptButton>
        </div>
        <div className="mt-5">
          <Steps steps={["Paste into your AI", "Ask it to deploy", "List it here"]} />
        </div>
      </div>
    </div>
  );
}
