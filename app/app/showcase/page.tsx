"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy, Plus } from "lucide-react";

import { ConfirmDialog, type ConfirmRequest } from "../../components/console/ConfirmDialog";
import { Alert, EmptyState, LinkButton, Page, PageHeader, Panel, PanelTitle, Skeleton, Steps } from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { projectsApi, showcaseApi } from "../../lib/hnsApi";
import { HnsError } from "../../lib/client";
import { useSession } from "../../lib/session";
import type { Project, ShowcaseCollection, ShowcaseListing } from "../../lib/types";

/**
 * Showcase, from the user's side.
 *
 * Three things exist here, and the page names each of them the same way
 * everywhere:
 *   Showcase          — Embarko's public gallery, embarko.ai/showcase.
 *   Your company page — your own page in it. Every company has one; only
 *                       your apps appear there.
 *   Event page        — a page anyone on Embarko can add an app to, for a
 *                       hackathon or demo day. Made by organisers, rarely.
 *
 * The page is organised around apps, not pages: the question someone comes
 * here with is "is my app on Showcase?", so the list of apps and their state
 * comes first. Event pages are an organiser's tool and sit at the bottom.
 */

/* Same regex as the API, so a typo is caught before the round trip. */
const SLUG_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugFrom(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

const SITE_HOST = "embarko.ai";

/** How many apps the list shows before it asks to be expanded. */
const APPS_SHOWN = 5;

export default function ShowcasePage() {
  const { activeCompanyId } = useSession();
  const [collections, setCollections] = useState<ShowcaseCollection[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [mine, setMine] = useState<ShowcaseListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setError(null);
    try {
      const [c, p, m] = await Promise.all([
        showcaseApi.listCollections(activeCompanyId),
        projectsApi.list(activeCompanyId),
        showcaseApi.listMySubmissions(activeCompanyId),
      ]);
      setCollections(c);
      setProjects(p);
      setMine(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load Showcase.");
      setCollections([]);
      setProjects([]);
      setMine([]);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyCompanyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/showcase/${slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function askRemove(l: ShowcaseListing) {
    const where = l.collection.type === "company" ? "Showcase" : l.collection.title;
    setConfirm({
      title: `Remove ${l.name} from ${where}?`,
      body: "Its public page goes away straight away. You can list it again any time.",
      cta: "Remove",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId) return;
        try {
          await showcaseApi.withdraw(activeCompanyId, l.id);
          await load();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn’t remove that.");
        }
      },
    });
  }

  const companyPage = collections?.find((c) => c.type === "company") ?? null;
  const eventPages = collections?.filter((c) => c.type === "public") ?? [];
  const loaded = collections !== null && projects !== null && mine !== null;
  const listedCount = mine?.filter((l) => l.collection.type === "company").length ?? 0;
  const firstRun = loaded && (mine?.length ?? 0) === 0;

  /* Listed apps first — they are the ones with something to look at — then
     the rest in the order the API gives. Capped so a company with dozens of
     apps gets a short list and a "show all", not a page-long one. */
  const listedIds = new Set(mine?.map((l) => l.projectId) ?? []);
  const sortedApps = [...(projects ?? [])].sort(
    (a, b) => Number(listedIds.has(b.id)) - Number(listedIds.has(a.id)),
  );
  const shownApps = showAll ? sortedApps : sortedApps.slice(0, APPS_SHOWN);

  return (
    <Page>
      <PageHeader
        title="Showcase"
        subtitle={
          <>
            Show off what you built. A listed app gets its own public page on{" "}
            <a href="/showcase" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
              {SITE_HOST}/showcase
            </a>{" "}
            and appears on your company page.
          </>
        }
        actions={
          <Button asChild>
            <Link href="/app/showcase/submit">
              <Plus aria-hidden="true" />
              List an app
            </Link>
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}

      {/* ---------------------------------------------------- company page */}
      <Panel padded className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <PanelTitle>Your company page</PanelTitle>
            <p className="mt-1 text-[0.9rem] text-muted-foreground">
              Every app you list appears here. Share this one link to show all your work.
            </p>
          </div>
          {companyPage && (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => copyCompanyLink(companyPage.slug)}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button asChild size="sm">
                <a href={`/showcase/${companyPage.slug}`} target="_blank" rel="noreferrer">
                  Open page
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}
        </div>
        {collections === null && <Skeleton className="h-6 w-72" aria-hidden="true" />}
        {companyPage && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem]">
            <span className="font-mono text-foreground">
              {SITE_HOST}/showcase/{companyPage.slug}
            </span>
            <span className="text-muted-foreground">
              {listedCount === 0 ? "No apps on it yet" : `${listedCount} ${listedCount === 1 ? "app" : "apps"} on it`}
            </span>
            {companyPage.counts.total > 0 && (
              <Link href={`/app/showcase/${companyPage.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                Manage
              </Link>
            )}
          </div>
        )}
        {collections !== null && !companyPage && (
          <p className="text-[0.85rem] text-muted-foreground">
            Your company page is being set up. Sign out and back in if it doesn’t appear.
          </p>
        )}
      </Panel>

      {/* ------------------------------------------------------- your apps */}
      <Panel padded className="flex flex-col gap-4">
        <div>
          <PanelTitle>Your apps</PanelTitle>
          <p className="mt-1 text-[0.9rem] text-muted-foreground">
            Which of your deployed apps are on Showcase.
          </p>
        </div>

        {!loaded && <Skeleton className="h-[120px]" aria-hidden="true" />}

        {loaded && projects!.length === 0 && (
          <EmptyState title="Deploy an app first">
            Showcase lists apps that are live on Embarko.{" "}
            <Link href="/app" className="text-foreground underline underline-offset-2">
              Deploy one
            </Link>{" "}
            and come back to list it.
          </EmptyState>
        )}

        {loaded && projects!.length > 0 && (
          <>
            {firstRun && (
              <div className="rounded-lg border border-dashed border-input bg-card/50 px-5 py-5 text-center">
                <p className="text-[0.95rem] font-semibold text-foreground">None of your apps are on Showcase yet.</p>
                <p className="mt-1 text-[0.85rem] text-muted-foreground">
                  Takes about a minute, or hand the prompt to the AI that built the app.
                </p>
                <Steps steps={["Pick an app", "Say what it does", "It’s live on Showcase"]} />
              </div>
            )}
            <ul className="divide-y divide-border">
              {shownApps.map((p) => (
                <AppRow
                  key={p.id}
                  project={p}
                  listings={mine!.filter((l) => l.projectId === p.id)}
                  onRemove={askRemove}
                />
              ))}
            </ul>
            {sortedApps.length > APPS_SHOWN && (
              <div className="border-t border-border pt-3">
                <LinkButton onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? "Show fewer" : `Show all ${sortedApps.length} apps`}
                </LinkButton>
              </div>
            )}
          </>
        )}
      </Panel>

      {/* ------------------------------------------------------ organisers */}
      <OrganiserSection
        companyId={activeCompanyId}
        pages={eventPages}
        loading={collections === null}
        onChanged={load}
        onError={setError}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}

/* One deployed app and where it is on Showcase. The state is one phrase:
   "On Showcase", "Not on Showcase", or the event it is on. */
function AppRow({
  project,
  listings,
  onRemove,
}: {
  project: Project;
  listings: ShowcaseListing[];
  onRemove: (l: ShowcaseListing) => void;
}) {
  const company = listings.find((l) => l.collection.type === "company") ?? null;
  const events = listings.filter((l) => l.collection.type !== "company");
  const visible = listings.find((l) => !l.isPrivate) ?? null;
  const listed = listings.length > 0;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-sm font-semibold text-primary">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{project.name}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-[0.8rem] text-muted-foreground">
            {listed ? (
              <>
                <span className={company && !company.isPrivate ? "text-success" : "text-foreground"}>
                  {company ? (company.isPrivate ? "Hidden on your company page" : "On Showcase") : `On ${events[0].collection.title}`}
                </span>
                {company &&
                  events.map((l) => (
                    <span key={l.id}>
                      · also on{" "}
                      <a href={`/showcase/${l.collection.slug}`} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                        {l.collection.title}
                      </a>
                      {l.isPrivate && " (hidden by organiser)"}
                    </span>
                  ))}
              </>
            ) : (
              <span>Not on Showcase</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {visible && (
          <a
            href={`/showcase/app/${visible.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            View page
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        )}
        {listed && (
          <Link
            href={`/app/showcase/submit?app=${encodeURIComponent(project.id)}${company ? "&where=event" : ""}`}
            className="text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            {company ? "Add to an event page" : "Add to your company page"}
          </Link>
        )}
        {listed && listings.length === 1 && (
          <LinkButton danger onClick={() => onRemove(listings[0])}>
            Remove
          </LinkButton>
        )}
        {/* On more than one page, "Remove" would have to guess which. The
            app's Showcase tab lists each page with its own Remove. */}
        {listed && listings.length > 1 && (
          <Link
            href={`/app/projects/${encodeURIComponent(project.id)}/showcase`}
            className="text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            Manage
          </Link>
        )}
        {!listed && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/showcase/submit?app=${encodeURIComponent(project.id)}`}>List it</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * Event pages, for the few people who run a hackathon or demo day. Folded
 * away until wanted, so someone who only came to list an app never has to
 * read about them — but open for anyone who already made one.
 */
function OrganiserSection({
  companyId,
  pages,
  loading,
  onChanged,
  onError,
}: {
  companyId: string | null;
  pages: ShowcaseCollection[];
  loading: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const expanded = open || pages.length > 0;

  /* The address follows the name until the person edits it by hand — the
     common case is "Walkover 2026" → walkover-2026 with no extra typing. */
  function onTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugFrom(value));
  }

  const slugValid = slug.length >= 3 && SLUG_RULE.test(slug);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !slugValid || !title.trim()) return;
    setCreating(true);
    setFormError(null);
    try {
      await showcaseApi.createCollection(companyId, { slug, title: title.trim() });
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setShowForm(false);
      await onChanged();
    } catch (e) {
      if (e instanceof HnsError && e.code === "SHOWCASE_SLUG_TAKEN") {
        setFormError(`${SITE_HOST}/showcase/${slug} is already taken. Try another address.`);
      } else {
        setFormError(e instanceof Error ? e.message : "Couldn’t create that page.");
      }
    } finally {
      setCreating(false);
    }
  }

  function askRemove(c: ShowcaseCollection) {
    setConfirm({
      title: `Remove ${c.title}?`,
      body: `${SITE_HOST}/showcase/${c.slug} goes away and the address becomes free for anyone. Only possible while no apps are on it.`,
      cta: "Remove page",
      destructive: true,
      onConfirm: async () => {
        if (!companyId) return;
        try {
          await showcaseApi.removeCollection(companyId, c.id);
          await onChanged();
        } catch (e) {
          if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_NOT_EMPTY") {
            onError("Apps are on that page, so it can’t be removed.");
          } else {
            onError(e instanceof Error ? e.message : "Couldn’t remove that.");
          }
        }
      },
    });
  }

  if (loading) return null;

  return (
    <Panel padded className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <PanelTitle>Event pages</PanelTitle>
          <p className="mt-1 text-[0.9rem] text-muted-foreground">
            Running a hackathon or demo day? An event page is a Showcase page anyone on Embarko can add
            their app to.
          </p>
        </div>
        {expanded ? (
          !showForm && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" />
              Create an event page
            </Button>
          )
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setOpen(true); setShowForm(true); }}>
            <ChevronDown aria-hidden="true" />
            I’m an organiser
          </Button>
        )}
      </div>

      {expanded && showForm && (
        <form className="mt-1 flex flex-col gap-3 rounded-md border border-border p-4" onSubmit={create}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[0.86rem] font-medium text-foreground">Event name</span>
              <Input
                className="mt-1.5 w-full"
                placeholder="e.g. Walkover Hackathon 2026"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
                maxLength={80}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-[0.86rem] font-medium text-foreground">Page address</span>
              <div className="mt-1.5 flex h-9 items-center rounded-md border border-input px-3 font-mono text-sm">
                <span className="shrink-0 text-muted-foreground">{SITE_HOST}/showcase/</span>
                <input
                  className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  placeholder="walkover-2026"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugFrom(e.target.value));
                  }}
                  maxLength={40}
                  spellCheck={false}
                />
              </div>
            </label>
          </div>
          <p className="text-[0.82rem] text-muted-foreground">
            The page is live as soon as you create it. The address can’t be changed later.
          </p>
          {formError && <Alert>{formError}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || !slugValid || !title.trim()}>
              {creating ? "Creating…" : "Create page"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {pages.length > 0 && (
        <ul className="divide-y divide-border">
          {pages.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0">
              <div className="min-w-0">
                <div className="font-medium text-foreground">{c.title}</div>
                <div className="flex flex-wrap items-center gap-x-3 text-[0.82rem] text-muted-foreground">
                  <a
                    href={`/showcase/${c.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono hover:text-foreground"
                  >
                    {SITE_HOST}/showcase/{c.slug}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </a>
                  <span>
                    {c.counts.total === 0
                      ? "No apps yet"
                      : `${c.counts.publicCount} ${c.counts.publicCount === 1 ? "app" : "apps"} shown`}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/showcase/${c.id}`}>Manage</Link>
                </Button>
                {c.counts.total === 0 && (
                  <LinkButton danger onClick={() => askRemove(c)}>
                    Remove
                  </LinkButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Panel>
  );
}
