"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronRight, Globe, Plus } from "lucide-react";

import { Alert, LinkButton, Page, PageHeader, Skeleton, Tag } from "@/app/components/console/kit";
import { Button } from "@/app/components/ui/button";
import { showcaseApi } from "@/app/lib/hnsApi";
import { useSession } from "@/app/lib/session";
import { readSeen } from "@/app/lib/showcaseSeen";
import { SITE_HOST } from "@/app/lib/site";
import type { ShowcaseCollection, ShowcaseListing } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";
import { resolveScreenshotUrl } from "@/app/showcase/kit";

/**
 * The Showcase tab: every showcase page this workspace has, one row each.
 *
 * The page is the object here, not the app. Two kinds exist and each keeps
 * one name everywhere:
 *   Embarko Showcase — the public gallery at embarko.ai/showcase, where the
 *                      workspace's own apps are listed. Always first.
 *   Event page       — a page anyone on Embarko can add an app to, for a
 *                      hackathon, class or demo day. Made here.
 *
 * Opening a row goes to that page's manage screen; everything you can do to
 * a page lives there, so this list stays a list. The builder's job ("is my
 * app on Showcase?") is one tap away: the Embarko Showcase row, or List an
 * app in the header.
 */

type Data = { collections: ShowcaseCollection[]; mine: ShowcaseListing[] };

function appCount(n: number): string {
  if (n === 0) return "No apps yet";
  return n === 1 ? "1 app" : `${n} apps`;
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt);

export default function ShowcasePage() {
  const { activeCompanyId } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  /* Bumped by "Try again" to re-run the load. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!activeCompanyId) return;
    let cancelled = false;
    setData(null);
    setFailed(false);
    Promise.all([
      showcaseApi.listCollections(activeCompanyId),
      /* Only feeds the thumbnails and the "other event pages" group, so a
         failure here shouldn't cost the person their list of pages. */
      showcaseApi.listMySubmissions(activeCompanyId).catch(() => [] as ShowcaseListing[]),
    ])
      .then(([collections, mine]) => {
        if (!cancelled) setData({ collections, mine });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId, attempt]);

  return (
    <Page>
      {/* Below sm the two actions become full-width, stacked, primary on top.
          Create comes first in the source too, so focus order matches what a
          phone shows; from sm the row is reversed to keep the primary on the
          right, as on every other panel header. PageHeader sizes its actions
          box to its content, so the width has to be set on that box from here
          (its last child). */}
      <div className="max-sm:[&>div>div:last-child]:w-full">
        <PageHeader
          title="Showcase"
          subtitle="Pages that show off apps. Make one for your hackathon, class or demo day."
          actions={
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row-reverse">
              <Button asChild className="max-sm:h-11 max-sm:w-full">
                <Link href="/app/showcase/new">
                  <Plus aria-hidden="true" />
                  Create new showcase
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      {failed ? (
        <div role="alert">
          <Alert>
            Couldn’t load your showcase pages.{" "}
            <LinkButton
              className={cn(
                "text-inherit underline underline-offset-2 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center",
                FOCUS,
              )}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </LinkButton>
          </Alert>
        </div>
      ) : data === null ? (
        <div className="flex flex-col gap-2.5" aria-hidden="true">
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-[72px]" />
        </div>
      ) : (
        <PageList data={data} />
      )}
    </Page>
  );
}

function PageList({ data }: { data: Data }) {
  const company = data.collections.find((c) => c.type === "company") ?? null;
  const events = data.collections.filter((c) => c.type === "public").sort(byNewest);
  const companyListings = data.mine.filter((l) => l.collection.type === "company").sort(byNewest);

  /* Event pages someone else runs that this workspace's apps are on. Grouped
     per page, the page with the most recent listing first. */
  const ownIds = new Set(data.collections.map((c) => c.id));
  const elsewhere = new Map<string, { collection: ShowcaseListing["collection"]; count: number }>();
  for (const l of [...data.mine].sort(byNewest)) {
    if (l.collection.type !== "public" || ownIds.has(l.collectionId)) continue;
    const entry = elsewhere.get(l.collectionId);
    if (entry) entry.count += 1;
    else elsewhere.set(l.collectionId, { collection: l.collection, count: 1 });
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2.5">
        {/* ------------------------------------------- Embarko Showcase */}
        {company ? (
          <Link href={`/app/showcase/${company.id}`} className={LINK_ROW}>
            <RowBody
              tile={<GalleryTile listings={companyListings.slice(0, 3)} />}
              title="Embarko Showcase"
              sub="Your workspace’s apps in the public gallery"
              meta={appCount(company.counts.total)}
            />
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ) : (
          /* Every workspace gets one; a brand-new workspace can reach this
             before the API has made it. Not a link — there's nothing to open. */
          <div className={ROW}>
            <RowBody
              tile={<GalleryTile listings={[]} />}
              title="Embarko Showcase"
              sub="Getting ready. Check back in a minute."
            />
          </div>
        )}

        {/* No event pages yet: the slot one would take, as an invitation. */}
        {events.length === 0 && (
          <Link
            href="/app/showcase/new"
            className={cn(ROW_SHAPE, FOCUS, "border-dashed border-input bg-transparent transition-colors hover:bg-card motion-reduce:transition-none")}
          >
            <RowBody
              tile={
                <span className="grid size-10 place-items-center rounded-full border border-dashed border-input text-muted-foreground">
                  <Plus className="size-4" aria-hidden="true" />
                </span>
              }
              title="Running a hackathon or demo day?"
              sub="Create an event page. Everyone’s apps live on one link."
            />
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* ------------------------------------------------ event pages */}
      {events.length > 0 && (
        <Group label="Your showcase pages">
          {events.map((c) => (
            <Link key={c.id} href={`/app/showcase/${c.id}`} className={LINK_ROW}>
              <RowBody
                tile={<PosterTile title={c.title} />}
                title={c.title}
                sub={`${SITE_HOST}/showcase/${c.slug}`}
                mono
                meta={
                  <>
                    <NewAppsTag collection={c} />
                    {appCount(c.counts.total)}
                  </>
                }
              />
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </Group>
      )}

      {/* -------------------------------- other people's event pages */}
      {elsewhere.size > 0 && (
        <Group label="Your apps on other event pages">
          {[...elsewhere].map(([id, { collection, count }]) => (
            <a
              key={id}
              href={`/showcase/${collection.slug}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${collection.title} in a new tab`}
              className={LINK_ROW}
            >
              <RowBody
                tile={<PosterTile title={collection.title} />}
                title={collection.title}
                sub={`${SITE_HOST}/showcase/${collection.slug}`}
                mono
                meta={count === 1 ? "1 of your apps" : `${count} of your apps`}
              />
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </a>
          ))}
        </Group>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ rows */

const ROW_SHAPE = "group flex min-h-[72px] items-center gap-3 rounded-lg border px-4 py-4 sm:gap-4 sm:px-5";
/* An outline in the ink token, not a ring: a ring can't take an alpha on a
   var() colour in Tailwind 3 and falls back to its default blue. */
const FOCUS =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ROW = cn(ROW_SHAPE, "border-border bg-card");
const LINK_ROW = cn(
  ROW,
  FOCUS,
  "transition-colors hover:bg-elevated motion-reduce:transition-none",
);

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[0.8rem] font-semibold text-muted-foreground">{label}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

/* Tile, two lines of text, and whatever sits on the right before the arrow. */
function RowBody({
  tile,
  title,
  sub,
  mono,
  meta,
}: {
  tile: React.ReactNode;
  title: string;
  sub: string;
  mono?: boolean;
  meta?: React.ReactNode;
}) {
  return (
    <>
      <span className="flex shrink-0 items-center">{tile}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">{title}</span>
        <span
          className={cn(
            "mt-0.5 block truncate",
            mono ? "font-mono text-[0.78rem] text-faint" : "text-[0.85rem] text-muted-foreground",
          )}
        >
          {sub}
        </span>
      </span>
      {meta && (
        /* Stacked on phones, so a "New apps" tag doesn't squeeze the name. */
        <span className="flex shrink-0 flex-col items-end gap-1 whitespace-nowrap text-[0.85rem] text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
          {meta}
        </span>
      )}
    </>
  );
}

/* An event page's tile: a tiny poster — paper square, the name's first
   letter in the serif the real poster uses. */
function PosterTile({ title }: { title: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 place-items-center rounded-md border border-border bg-background text-[22px] leading-none text-foreground"
    >
      <span className="ds-serif">{title.trim().charAt(0).toUpperCase() || "E"}</span>
    </span>
  );
}

/* Embarko Showcase's tile: the workspace's latest listed apps, fanned out
   newest on top — or a globe while there are none. */
function GalleryTile({ listings }: { listings: ShowcaseListing[] }) {
  if (listings.length === 0) {
    return (
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
        <Globe className="size-[18px]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex">
      {listings.map((l, i) => (
        <span
          key={l.id}
          style={{ zIndex: listings.length - i }}
          className={cn(
            "relative size-9 overflow-hidden rounded-md bg-muted ring-2 ring-card transition-shadow group-hover:ring-elevated motion-reduce:transition-none max-sm:size-10",
            /* Phones keep only the newest, so the name beside it fits. */
            i > 0 && "-ml-2.5 max-sm:hidden",
          )}
        >
          <Thumb listing={l} />
        </span>
      ))}
    </span>
  );
}

/* A screenshot if there is one that loads, otherwise the app's first letter. */
function Thumb({ listing }: { listing: ShowcaseListing }) {
  const [broken, setBroken] = useState(false);
  const src = listing.screenshotUrl?.trim();
  if (!src || broken) {
    return (
      <span className="grid size-full place-items-center text-[0.8rem] font-semibold text-foreground">
        {listing.name.trim().charAt(0).toUpperCase() || "A"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party URLs, as in app/showcase/kit
    <img
      src={resolveScreenshotUrl(src)}
      alt=""
      loading="lazy"
      className="size-full object-cover object-top"
      onError={() => setBroken(true)}
    />
  );
}

/* "New apps" since the organiser last opened the page. The manage page
   records what it saw; nothing is shown for a page never opened here. */
function NewAppsTag({ collection }: { collection: ShowcaseCollection }) {
  const seen = readSeen(collection.id);
  if (!seen || collection.counts.total <= seen.total) return null;
  return <Tag tone="ok">New apps</Tag>;
}
