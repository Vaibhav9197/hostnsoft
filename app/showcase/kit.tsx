import Link from "next/link";

import type { ShowcaseApp } from "../lib/showcase";
/* From showcaseOptions, not showcase: that module pulls in next/headers,
   and this file is rendered by a client component (SearchGallery). */
import { categorySlug } from "../lib/showcaseOptions";

/* The marketing pages' measure and buttons. Copied as constants rather than
   imported from v3/page.tsx: that module is a landing-page variant behind
   middleware and may be replaced, and Showcase should not break when it is. */
export const WRAP = "mx-auto w-full max-w-[74rem]";

const BTN =
  "inline-flex items-center gap-2 rounded-[8px] px-[18px] py-[10px] text-sm font-semibold transition active:scale-[0.97]";
export const BTN_PRIMARY = `${BTN} bg-primary text-primary-foreground hover:bg-[var(--accent-2)]`;
export const BTN_GHOST = `${BTN} border border-border text-foreground hover:border-[var(--line-strong)]`;

export const LABEL = "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

/**
 * The stand-in shown when a submission has no screenshot.
 *
 * Not a grey box and not a logo: the page's whole premise is that you are
 * looking at the thing someone made, so an empty slot reads as a broken app
 * rather than a missing file. This draws an abstract suggestion of an
 * interface instead, seeded from the slug so a given app always gets the same
 * one and the gallery doesn't reshuffle between renders.
 *
 * It is decoration, so it is hidden from assistive tech — the name and the
 * description next to it carry the meaning.
 */
function PreviewArt({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  const tint = (pct: number) => `color-mix(in srgb, var(--ink) ${pct}%, transparent)`;
  const blocks = 4 + (hash % 3);

  /* Laid out as an app window rather than a few floating bars: these frames
     are large, and centred fragments in a big empty box read as a failed image
     instead of a stand-in. Filling the frame makes it read as "a screenshot we
     don't have" rather than "something broke". */
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col p-[3%]">
      <div className="flex items-center gap-1.5 pb-[2.5%]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} />
        <span className="h-1.5 flex-1 rounded-[2px]" style={{ background: tint(10) }} />
      </div>

      <div className="flex min-h-0 flex-1 gap-[3%]">
        {/* Sidebar */}
        <div className="flex w-[18%] flex-col gap-[6%] rounded-[4px] p-[6%]" style={{ background: tint(6) }}>
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-[2px]"
              style={{ background: tint(i === hash % 4 ? 24 : 12), width: `${70 + ((hash >> i) % 3) * 10}%` }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-[3%]">
          <div
            className="flex-[1.6] rounded-[4px]"
            style={{ background: "color-mix(in srgb, var(--ok) 16%, transparent)" }}
          />
          <div className="grid flex-1 grid-cols-3 gap-[3%]">
            {Array.from({ length: blocks > 6 ? 6 : blocks }, (_, i) => (
              <span key={i} className="rounded-[4px]" style={{ background: tint(8 + ((hash >> i) % 3) * 4) }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One app's visual. `priority` is for the single hero image only — marking a
 * whole gallery as priority tells the browser nothing, since everything urgent
 * is nothing urgent.
 */
export function AppPreview({
  app,
  className = "",
}: {
  app: ShowcaseApp;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-border bg-elevated ${className}`}
    >
      {app.screenshotUrl ? (
        /* Plain img, not next/image: these are arbitrary third-party URLs from
           a public form, and routing them through the optimiser would make this
           site fetch whatever a submitter points it at. */
        <img
          src={app.screenshotUrl}
          alt={`${app.name} screenshot`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <PreviewArt seed={app.slug} />
      )}
    </div>
  );
}

/** The creator line, linked when they gave somewhere to link to. */
export function Creator({ app }: { app: ShowcaseApp }) {
  if (!app.creatorProfile) {
    return <span className="text-muted-foreground">{app.creatorName}</span>;
  }
  return (
    <a
      href={app.creatorProfile}
      target="_blank"
      rel="noreferrer nofollow"
      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {app.creatorName}
    </a>
  );
}

/**
 * A gallery tile.
 *
 * Everything on it is about the app: preview, name, what it does, who made it.
 * Nothing about where it runs — memory, runtime, deploy status and the rest are
 * deliberately absent, and the tile links to the app's own page rather than
 * opening the app, so the creator gets the visit.
 */
export function AppCard({ app }: { app: ShowcaseApp }) {
  return (
    <article className="group relative flex flex-col gap-4 rounded-[14px] border border-border bg-card p-4 transition hover:border-[var(--line-strong)]">
      <AppPreview app={app} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-3">
          {/* The title link is stretched over the whole card, so the tile still
              opens the app's page wherever it is clicked. The category sits
              above it (z-10) as its own link: nesting one <a> inside another
              is invalid HTML, and this keeps both clickable. */}
          <h3 className="text-[17px] font-semibold leading-tight">
            <Link
              href={`/showcase/app/${app.slug}`}
              className="after:absolute after:inset-0 after:rounded-[14px] after:content-['']"
            >
              {app.name}
            </Link>
          </h3>
          {app.category && (
            <Link
              href={`/showcase/category/${categorySlug(app.category)}`}
              className={`${LABEL} relative z-10 shrink-0 transition-colors hover:text-foreground`}
            >
              {app.category}
            </Link>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-[1.55] text-muted-foreground">
          {app.tagline}
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          by <span className="text-foreground">{app.creatorName}</span>
          {app.builtWith && <span className="text-muted-foreground"> · {app.builtWith}</span>}
        </p>
      </div>
    </article>
  );
}

/** The three-step run-through the rest of the site ends on. */
export function PromptSteps() {
  return (
    <ol className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
      {["Copy", "Paste into your AI", "Ask it to deploy"].map((step, i) => (
        <li key={step} className={`${LABEL} flex items-center gap-2`}>
          <span className="text-foreground">{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
