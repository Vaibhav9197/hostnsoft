import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../../components/SiteHeader";
import { SiteFooter } from "../../../components/SiteFooter";
import { SITE } from "../../../lib/site";
import { categorySlug, getApp, type ShowcaseApp } from "../../../lib/showcase";
import { AppPreview, BTN_GHOST, BTN_PRIMARY, Creator, LABEL, WRAP } from "../../kit";
import { ShareRow } from "../../share";
import { ShowcaseBreadcrumbs } from "../../breadcrumbs";

/* youtu.be/<id> and youtube.com/watch?v=<id> are what the submit form's plain
   URL field actually receives — creators paste whatever's in their browser's
   address bar, never an embed link. Only these two get a playable embed;
   anything else (Vimeo, Loom, a direct .mp4) still gets a working "Watch the
   video" link, just not an inline player. */
function youtubeEmbedUrl(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.hostname === "youtu.be") return `https://www.youtube.com/embed${url.pathname}`;
    if (url.hostname.endsWith("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${url.searchParams.get("v")}`;
    }
  } catch {
    return null;
  }
  return null;
}

/* SoftwareApplication schema for this one app — Organization/WebApplication
   already cover the site in the root layout, this is the per-app entity.
   Search and AI answer engines (Perplexity, ChatGPT search, Google's AI
   Overviews) both lean on structured data to describe a specific thing
   accurately rather than paraphrasing prose, which is why this exists
   separately from the visible copy below rather than instead of it.

   tagline is required at submission and short — the more useful signal for
   both a search snippet and a schema description. whatItDoes only backs it
   up on the rare listing predating that requirement; nothing here can
   produce an empty description, since name is always assigned and tagline
   always exists whenever whatItDoes might not. */
function structuredData(app: ShowcaseApp) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.tagline || app.whatItDoes || app.name,
    url: `${SITE}/showcase/app/${app.slug}`,
    image: app.screenshotUrl || undefined,
    applicationCategory: app.category || undefined,
    dateCreated: app.createdAt,
    author: { "@type": "Person", name: app.creatorName },
    ...(app.builtWith ? { softwareRequirements: app.builtWith } : {}),
    ...(app.videoUrl ? { video: { "@type": "VideoObject", name: `${app.name} demo`, contentUrl: app.videoUrl } } : {}),
  };
}

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
  /* tagline is required at submission, short, and to the point — the
     stronger element for a search snippet than a longer free-text field.
     whatItDoes is optional and only fills in on a listing without one. */
  const description = app.tagline || app.whatItDoes || undefined;
  return {
    title: `${app.name} — Showcase`,
    description,
    keywords: [app.name, app.category, app.builtWith, ...app.tags].filter(
      (v): v is string => !!v,
    ),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(app)) }}
      />
      <ShowcaseBreadcrumbs
        trail={[
          ...(app.category
            ? [{ name: app.category, path: `/showcase/category/${categorySlug(app.category)}` }]
            : []),
          { name: app.name, path: `/showcase/app/${app.slug}` },
        ]}
      />
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
            {/* Creator-submitted URLs are user-generated content: `nofollow ugc`
                keeps a listing from passing our link equity to whatever was
                pasted into the form. */}
            <a href={app.appUrl} target="_blank" rel="noreferrer nofollow ugc" className={BTN_PRIMARY}>
              Open app
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <ShareRow title={`${app.name} — ${app.tagline}`} />
          </div>

          <AppPreview app={app} className="mt-12 aspect-[16/9] max-[720px]:aspect-[4/3]" />

          {/* Collected on the submit form since it shipped, never shown until
              now. A playable demo is both a better reason to stay on the page
              and, per the schema above, a second indexable asset for it. */}
          {app.videoUrl && (
            <section className="mt-10">
              <h2 className="text-[19px] font-semibold">Demo</h2>
              {youtubeEmbedUrl(app.videoUrl) ? (
                <div className="mt-4 aspect-video overflow-hidden rounded-[12px] border border-border">
                  <iframe
                    src={youtubeEmbedUrl(app.videoUrl)!}
                    title={`${app.name} demo`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ) : (
                <a
                  href={app.videoUrl}
                  target="_blank"
                  rel="noreferrer nofollow ugc"
                  className="mt-3 inline-block text-[15px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Watch the video →
                </a>
              )}
            </section>
          )}

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
                  <p className="mt-1.5">
                    <Link
                      href={`/showcase/category/${categorySlug(app.category)}`}
                      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      {app.category}
                    </Link>
                  </p>
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
