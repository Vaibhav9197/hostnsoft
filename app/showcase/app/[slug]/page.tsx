import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Copy, Sparkles } from "lucide-react";

import { SiteHeader } from "../../../components/SiteHeader";
import { SiteFooter } from "../../../components/SiteFooter";
import { SITE } from "../../../lib/site";
import { categorySlug, getApp, listApps, tagSlug, type ShowcaseApp } from "../../../lib/showcase";
import { TileGrid, hostOf } from "../../kit";
import { CopyPromptButton, COPIED_LABEL } from "../../../components/CopyPromptButton";
import { ShareApp } from "../../share";
import { Media } from "./Media";
import { ShowcaseBreadcrumbs } from "../../breadcrumbs";

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

/* Blank-line separated paragraphs; single newlines stay as line breaks. */
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/* The design's pull quote: the first sentence of "why", when it is a
   reasonable length and something follows it. */
function splitPull(text: string): [string, string] | null {
  const m = text.trim().match(/^(.{20,220}?[.!?])\s+([\s\S]+)$/);
  return m ? [m[1], m[2]] : null;
}

const LISTED = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export default async function ShowcaseAppPage({ params }: Props) {
  const { slug } = await params;
  const [app, all] = await Promise.all([getApp(slug), listApps(200)]);
  /* Hidden listings 404 like unknown ones. */
  if (!app) notFound();

  /* Matched on the live address, not the slug: a second listing of the same
     app mustn't appear as its own "related" app. */
  const sameApp = (a: ShowcaseApp) =>
    a.appUrl.replace(/\/+$/, "").toLowerCase() === app.appUrl.replace(/\/+$/, "").toLowerCase();
  const others = all.filter((a) => !sameApp(a));

  /* Related: same maker first, then same category, then newest. */
  const score = (x: ShowcaseApp) =>
    (x.creatorName === app.creatorName ? 4 : 0) + (app.category && x.category === app.category ? 1 : 0);
  const related = [...others].sort((a, b) => score(b) - score(a)).slice(0, 3);

  const sections = [
    app.whatItDoes && { key: "what", eyebrow: "The product", title: "What it does", text: app.whatItDoes },
    app.whyBuilt && { key: "why", eyebrow: "The reason", title: "Why it was built", text: app.whyBuilt },
  ].filter((s): s is { key: string; eyebrow: string; title: string; text: string } => !!s);

  const listed = Number.isNaN(Date.parse(app.createdAt)) ? null : LISTED.format(new Date(app.createdAt));
  const host = hostOf(app.appUrl);

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

      <article className="sc-wrap sc-layer">
        <section className="sc-top">
          <div className="sc-info">
            {app.category && (
              <div className="sc-badges">
                <Link href={`/showcase/category/${categorySlug(app.category)}`} className="sc-pill">
                  {app.category}
                </Link>
              </div>
            )}
            <h1 className="sc-name" style={{ ["--len" as string]: Math.max(app.name.length, 4) }}>
              {app.name}
            </h1>
            <p className="sc-what">{app.tagline}</p>
            <div className="sc-byline">
              <span>
                <span className="sc-serif by">by</span>{" "}
                {app.creatorProfile ? (
                  <a href={app.creatorProfile} target="_blank" rel="noreferrer nofollow ugc">
                    {app.creatorName}
                  </a>
                ) : (
                  <b>{app.creatorName}</b>
                )}
              </span>
              {app.builtWith && (
                <>
                  <span className="dotsep" aria-hidden="true">
                    ·
                  </span>
                  <span>Built with {app.builtWith}</span>
                </>
              )}
            </div>
            <div className="sc-actions">
              <a href={app.appUrl} target="_blank" rel="noreferrer nofollow ugc" className="sc-btn pri lg">
                Open {app.name.length > 14 ? "app" : app.name}
                <ArrowUpRight aria-hidden="true" />
                <span className="sc-sr">(opens in a new tab)</span>
              </a>
              <a href="#ship" className="sc-btn lg">
                <Sparkles aria-hidden="true" />
                Deploy yours
              </a>
            </div>
            {app.tags.length > 0 && (
              <div className="sc-tags">
                {app.tags.map((tag) => (
                  <Link key={tag} href={`/showcase/tag/${tagSlug(tag)}`} className="sc-tag">
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Media app={app} />
        </section>

        <div className="sc-cols">
          {sections.length > 0 && (
            <div className="l">
              {sections.map((s, n) => {
                const pull = s.key === "why" ? splitPull(s.text) : null;
                const paras = paragraphs(pull ? pull[1] : s.text);
                return (
                  <section key={s.key} className="sc-txt" aria-labelledby={`h-${s.key}`}>
                    <span className="sc-eyebrow">
                      {String(n + 1).padStart(2, "0")} — {s.eyebrow}
                    </span>
                    <h2 id={`h-${s.key}`}>{s.title}</h2>
                    <div className="sc-prose">
                      {pull && <p className="pull">{pull[0]}</p>}
                      {paras.map((p, j) => (
                        <p key={j} className={!pull && j === 0 ? "lead" : undefined}>
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="r">
            <aside className="sc-side">
              <ShareApp name={app.name} title={`${app.name} — ${app.tagline}`} />
              <div>
                <h2 className="sc-eyebrow">Details</h2>
                <dl className="sc-meta">
                  <div>
                    <dt>Made by</dt>
                    <dd>
                      {app.creatorProfile ? (
                        <a href={app.creatorProfile} target="_blank" rel="noreferrer nofollow ugc">
                          {app.creatorName}
                        </a>
                      ) : (
                        app.creatorName
                      )}
                    </dd>
                  </div>
                  {app.category && (
                    <div>
                      <dt>Category</dt>
                      <dd>
                        <Link href={`/showcase/category/${categorySlug(app.category)}`}>{app.category}</Link>
                      </dd>
                    </div>
                  )}
                  {app.builtWith && (
                    <div>
                      <dt>Built with</dt>
                      <dd>{app.builtWith}</dd>
                    </div>
                  )}
                  {app.collection && (
                    <div>
                      <dt>Part of</dt>
                      <dd>
                        <Link href={`/showcase/${encodeURIComponent(app.collection.slug)}`}>{app.collection.title}</Link>
                      </dd>
                    </div>
                  )}
                  {listed && (
                    <div>
                      <dt>Listed</dt>
                      <dd>{listed}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Address</dt>
                    <dd>
                      <a className="sc-mono" href={app.appUrl} target="_blank" rel="noreferrer nofollow ugc">
                        {host}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>

        <section className="sc-ship" id="ship" aria-labelledby="ship-h">
          <span className="sc-pill grad">
            <Sparkles aria-hidden="true" className="h-3 w-3" />
            Your turn
          </span>
          <h2 id="ship-h">
            Seen enough?
            <br />
            <span className="sc-serif">Ship</span> something.
          </h2>
          <p>Copy the Embarko prompt, paste it into your AI agent, and your app goes live on its own link.</p>
          <div className="sc-ctas">
            <CopyPromptButton className="sc-btn pri lg glow" copiedChildren={COPIED_LABEL}>
              <Copy aria-hidden="true" />
              Copy deployment prompt
            </CopyPromptButton>
          </div>
          <ol className="sc-steps">
            <li>Copy</li>
            <li aria-hidden="true"><i>→</i></li>
            <li>Paste into your agent</li>
            <li aria-hidden="true"><i>→</i></li>
            <li>Share your link</li>
          </ol>
        </section>

        {related.length > 0 && (
          <section className="sc-more" aria-labelledby="more-h">
            <div className="sc-sech">
              <div>
                <h2 id="more-h">More from the Showcase</h2>
                <p>Same maker or category first.</p>
              </div>
              <Link href="/showcase" className="sc-btn sm">
                See all <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div className="pb-16">
              <TileGrid apps={related} />
            </div>
          </section>
        )}
      </article>

      <SiteFooter />
    </main>
  );
}
