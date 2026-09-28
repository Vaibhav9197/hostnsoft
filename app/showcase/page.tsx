import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { COPIED_LABEL, CopyPromptButton } from "../components/CopyPromptButton";
import { listApps, listIndexableCollections, type ShowcaseApp } from "../lib/showcase";
import { DeployCta, Shot, Steps, firstName } from "./kit";
import { SearchGallery } from "./SearchGallery";

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
  const collections = await listIndexableCollections();
  const spotlight = pickSpotlight(apps);

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />
      <div className="sc-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-gridbg" aria-hidden="true" />

      <div className="sc-wrap sc-layer">
        <section className="sc-hero">
          <h1>
            Ideas people had.
            <br />
            <span className="sc-serif sc-gtext">Live</span> on a real link.
          </h1>
          <p>
            Every app here was built by someone&rsquo;s own AI agent and put online with Embarko. Open
            one, then make your own.
          </p>
          <div className="sc-ctas">
            <CopyPromptButton className="sc-btn pri lg glow" copiedChildren={COPIED_LABEL}>
              <Copy aria-hidden="true" />
              Copy deployment prompt
            </CopyPromptButton>
            <a className="sc-btn lg" href={apps.length > 0 ? "#explore" : "#deploy"}>
              Explore apps
            </a>
          </div>
        </section>

        {spotlight && <Spotlight {...spotlight} />}

        {apps.length > 0 ? (
          <SearchGallery apps={apps} collections={collections} />
        ) : (
          <EmptyState />
        )}

        <DeployCta />
      </div>
      <SiteFooter />
    </main>
  );
}

/* The team's pick when there is one; otherwise the newest listing, labelled
   as such so it never claims a curation that didn't happen. */
function pickSpotlight(apps: ShowcaseApp[]): { app: ShowcaseApp; picked: boolean } | null {
  const featured = apps.find((a) => a.featured);
  if (featured) return { app: featured, picked: true };
  const newest = [...apps].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  return newest ? { app: newest, picked: false } : null;
}

function Spotlight({ app, picked }: { app: ShowcaseApp; picked: boolean }) {
  return (
    <section aria-labelledby="spot-h">
      <div className="sc-sech">
        <div>
          <h2 id="spot-h">{picked ? "App of the day" : "Just listed"}</h2>
          <p>{picked ? "Picked by the Embarko team for the idea, not the polish." : "The newest app on the Showcase."}</p>
        </div>
      </div>
      <Link href={`/showcase/app/${app.slug}`} className="sc-feat">
        <div className="fimg">
          <div>
            <Shot app={app} alt={`${app.name} screenshot`} eager />
          </div>
        </div>
        <div className="fbd">
          {app.category && (
            <div>
              <span className="sc-pill">{app.category}</span>
            </div>
          )}
          <h3>{app.name}</h3>
          <p>{app.tagline}</p>
          <div className="fbtns">
            <span className="sc-btn pri">
              See the app <ArrowRight aria-hidden="true" />
            </span>
            <span className="sc-btn">by {firstName(app.creatorName)}</span>
          </div>
        </div>
      </Link>
    </section>
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
          <Link href="/app/showcase/submit" className="sc-btn">
            List your app
          </Link>
        </div>
        <div className="mt-5">
          <Steps steps={["Paste into your AI", "Ask it to deploy", "List it here"]} />
        </div>
      </div>
    </div>
  );
}
