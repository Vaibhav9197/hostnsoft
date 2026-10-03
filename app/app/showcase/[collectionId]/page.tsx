"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Copy, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";

import { COPIED_LABEL, CopyPromptButton } from "@/app/components/CopyPromptButton";
import { ConfirmDialog, type ConfirmRequest } from "@/app/components/console/ConfirmDialog";
import { Alert, EmptyState, LinkButton, Page, Panel, PanelTitle, Skeleton, Tag } from "@/app/components/console/kit";
import { CopyButton } from "@/app/components/console/showcase/CopyButton";
import { InviteCard } from "@/app/components/console/showcase/InviteCard";
import { ListingRows, showingText } from "@/app/components/console/showcase/ListingRows";
import { RequestRows } from "@/app/components/console/showcase/RequestRows";
import { ShareKit } from "@/app/components/console/showcase/ShareKit";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { HnsError } from "@/app/lib/client";
import { projectsApi, showcaseApi } from "@/app/lib/hnsApi";
import { useSession } from "@/app/lib/session";
import { readSeen, writeSeen, type Seen } from "@/app/lib/showcaseSeen";
import { showcaseGeneralPrompt, showcaseListPrompt } from "@/app/lib/showcasePrompt";
import { ListOnShowcaseDialog } from "@/app/components/console/showcase/ListOnShowcaseDialog";
import { useOrigin } from "@/app/lib/showcaseShare";
import { SITE_HOST } from "@/app/lib/site";
import type { Project, ShowcaseCollectionDetail, ShowcaseListing } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

/**
 * One showcase page, from the side of whoever owns it. Two kinds:
 *
 *   Event page        — made by an organiser for a hackathon, class or demo
 *                       day; anyone on Embarko can add an app to it. Here the
 *                       job is getting the word out (the share kit), then
 *                       keeping an eye on what arrives.
 *   Embarko Showcase  — the workspace's own page, which is how its apps get
 *                       into the public gallery. Here the job is "which of my
 *                       apps are on it", and listing the ones that aren't.
 *
 * The owner controls one thing per app — whether it shows on the public
 * page — and can take an app off. Everything else about an app is its
 * builder's, from their own panel or their AI.
 *
 * An event page keeps itself current while it's open: new apps are held in
 * a "2 new apps just added · Show" line rather than pushed into the list, so
 * the list never moves under the organiser's cursor. Embarko Showcase only
 * re-reads when you come back to the tab — usually after your AI listed an
 * app — and puts what's new straight in the list.
 */

const POLL_MS = 30_000;
/* After ten quiet minutes the page checks half as often. */
const POLL_QUIET_MS = 60_000;
const QUIET_AFTER_MS = 10 * 60_000;
/* Matches the row's collapse transition in ListingRows. */
const COLLAPSE_MS = 200;
const UNLISTED_SHOWN = 5;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type Meta = Omit<ShowcaseCollectionDetail, "projects">;

function metaOf(d: ShowcaseCollectionDetail): Meta {
  const { projects, ...meta } = d;
  void projects;
  return meta;
}

/* What counts as "something changed" for the poll's back-off. */
function signature(list: ShowcaseListing[]): string {
  return list
    .map((l) => `${l.id}:${l.updatedAt}:${l.isPrivate ? 1 : 0}:${l.status}`)
    .sort()
    .join("|");
}

function withId(s: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return new Set(s).add(id);
}

function withoutId(s: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(s);
  next.delete(id);
  return next;
}

/* A navigation that looks like LinkButton, at a 44px target on phones. */
function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center text-[0.84rem] font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline motion-reduce:transition-none sm:min-h-0",
        FOCUS,
      )}
    >
      {children}
    </Link>
  );
}

export default function ShowcaseManagePage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { activeCompanyId } = useSession();
  const origin = useOrigin();

  const [status, setStatus] = useState<"loading" | "ready" | "notFound" | "error">("loading");
  const [meta, setMeta] = useState<Meta | null>(null);
  /* The rows on screen, and the ones that arrived while you were looking. */
  const [rows, setRows] = useState<ShowcaseListing[]>([]);
  const [pending, setPending] = useState<ShowcaseListing[]>([]);
  /* What this browser saw last visit, read once per page before it's
     overwritten, and the ids that came in through "Show" since. */
  const [prevSeen, setPrevSeen] = useState<Seen | null>(null);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsFailed, setProjectsFailed] = useState(false);
  /* The app whose "List it" dialog is open. */
  const [listTarget, setListTarget] = useState<Project | null>(null);
  const [removing, setRemoving] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  /* Whether shared prompts carry the page code (apps then skip review).
     One choice for the card and the ⋮ menu, so both copy the same prompt.
     Off by default: skipping review is something the owner opts into. */
  const [includeCode, setIncludeCode] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showAllUnlisted, setShowAllUnlisted] = useState(false);

  /* Read by the refresh, which runs outside render. */
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const removingRef = useRef(removing);
  removingRef.current = removing;

  /* listing id → the newest switch flip still waiting on the server. A
     refresh leaves those rows alone so a slow poll can't undo a flip. */
  const inflight = useRef(new Map<string, number>());
  const opSeq = useRef(0);
  /* A clock shared by refreshes and flips. A flip that settles after a
     refresh began is newer than what that refresh read, so the refresh
     keeps the row as it is on screen. */
  const clock = useRef(0);
  const settledAt = useRef(new Map<string, number>());
  /* Listings removed here. A refresh that read the page before the removal
     landed must not bring one back as "new". */
  const removedIds = useRef(new Set<string>());
  const lastSig = useRef("");
  const lastChange = useRef(0);
  const seenFor = useRef<string | null>(null);
  const refreshing = useRef(false);
  const celebrateHeading = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* Arriving from "Create event page": play the moment once, then drop the flag
     from the address so a reload or a shared link never replays it. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") !== "1") return;
    setCelebrate(true);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /* `quiet`: a re-read in the background, which keeps what's on screen if
     it fails rather than hiding the sections that depend on it. */
  const loadProjects = useCallback(async (companyId: string, quiet = false) => {
    try {
      setProjects(await projectsApi.list(companyId));
      setProjectsFailed(false);
    } catch {
      if (quiet) return;
      setProjects(null);
      setProjectsFailed(true);
    }
  }, []);

  const load = useCallback(async () => {
    if (!activeCompanyId || !collectionId) return;
    setStatus("loading");
    try {
      const d = await showcaseApi.getCollection(activeCompanyId, collectionId);
      setMeta(metaOf(d));
      setRows(d.projects);
      setPending([]);
      lastSig.current = signature(d.projects);
      lastChange.current = Date.now();
      if (seenFor.current !== d.id) {
        seenFor.current = d.id;
        setPrevSeen(readSeen(d.id));
        writeSeen(d.id, d.projects.length);
      }
      setStatus("ready");
      void loadProjects(activeCompanyId);
    } catch (e) {
      setStatus(e instanceof HnsError && e.status === 404 ? "notFound" : "error");
    }
  }, [activeCompanyId, collectionId, loadProjects]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * A quiet re-read: no skeleton, and search, chips and scroll stay put.
   * Changes and removals apply at once; apps that are new to the screen wait
   * in `pending` — unless `reveal`, or this is Embarko Showcase, where they
   * go straight in the list. There nobody is watching the list fill up: the
   * new app is almost always one your own AI just listed, and holding it
   * back would leave the header counting an app the body doesn't show.
   */
  const refresh = useCallback(
    async (reveal = false) => {
      if (!activeCompanyId || !collectionId || refreshing.current) return;
      refreshing.current = true;
      const started = ++clock.current;
      try {
        const fresh = await showcaseApi.getCollection(activeCompanyId, collectionId);
        const listings = fresh.projects.filter((p) => !removedIds.current.has(p.id));
        const sig = signature(listings);
        if (sig !== lastSig.current) {
          lastSig.current = sig;
          lastChange.current = Date.now();
        }
        const byId = new Map(listings.map((p) => [p.id, p]));
        const current = rowsRef.current;
        const onScreen = new Set(current.map((r) => r.id));
        const kept = current.flatMap((r) => {
          const f = byId.get(r.id);
          /* Gone upstream: drop it, unless it's mid-collapse from our own Remove. */
          if (!f) return removingRef.current.has(r.id) ? [r] : [];
          const newerHere = inflight.current.has(r.id) || (settledAt.current.get(r.id) ?? 0) > started;
          return newerHere ? [r] : [f];
        });
        const arrived = listings.filter((p) => !onScreen.has(p.id) && p.status === "approved");
        /* Requests (and reviews of them) show at once: they're the organiser's to act on. */
        const requests = listings.filter((p) => !onScreen.has(p.id) && p.status !== "approved");
        if (requests.length > 0) kept.unshift(...requests);

        setMeta(metaOf(fresh));
        if (reveal || fresh.type === "public") {
          setRows([...arrived, ...kept]);
          setPending([]);
          if (fresh.type === "event") setRevealed((s) => new Set([...s, ...arrived.map((a) => a.id)]));
          writeSeen(fresh.id, arrived.length + kept.filter((r) => !removingRef.current.has(r.id)).length);
        } else {
          setRows(kept);
          setPending(arrived);
        }
      } catch {
        /* Keep what's on screen; the next check tries again. */
      } finally {
        refreshing.current = false;
      }
    },
    [activeCompanyId, collectionId],
  );

  const isEvent = meta?.type === "event";

  /* Coming back to the tab is when someone most expects fresh numbers. On
     Embarko Showcase that is also when an app may have been deployed, so
     "Not on Showcase yet" is re-read too. */
  useEffect(() => {
    if (status !== "ready") return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
      if (activeCompanyId) void loadProjects(activeCompanyId, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, refresh, isEvent, activeCompanyId, loadProjects]);

  /* Event pages fill up while the organiser watches; poll while visible. */
  useEffect(() => {
    if (status !== "ready" || !isEvent) return;
    let stopped = false;
    let timer = 0;
    const schedule = () => {
      const quiet = Date.now() - lastChange.current > QUIET_AFTER_MS;
      timer = window.setTimeout(
        async () => {
          if (document.visibilityState === "visible") await refresh();
          if (!stopped) schedule();
        },
        quiet ? POLL_QUIET_MS : POLL_MS,
      );
    };
    schedule();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [status, isEvent, refresh]);

  /* ------------------------------------------------------------ derived */

  /* Approved listings are "the page"; the rest are requests, shown above it. */
  const liveRows = useMemo(() => rows.filter((r) => !removing.has(r.id) && r.status === "approved"), [rows, removing]);
  const requestRows = useMemo(() => rows.filter((r) => !removing.has(r.id) && r.status !== "approved"), [rows, removing]);
  /* The header counts what's on the page now, including apps not yet shown. */
  const everything = useMemo(() => [...liveRows, ...pending], [liveRows, pending]);
  const total = everything.length;
  const countText = showingText(everything);

  const isNew = useCallback(
    (l: ShowcaseListing) =>
      revealed.has(l.id) || (prevSeen !== null && Date.parse(l.createdAt) > Date.parse(prevSeen.at)),
    [revealed, prevSeen],
  );
  const unlisted = useMemo(() => {
    const listed = new Set(everything.map((l) => l.projectId));
    return (projects ?? []).filter((p) => !listed.has(p.id));
  }, [everything, projects]);

  const showCelebration = celebrate && isEvent && liveRows.length === 0;

  useEffect(() => {
    if (showCelebration) celebrateHeading.current?.focus();
  }, [showCelebration]);

  /* The moment plays once. After the first app is on the list it's spent,
     so removing that app later doesn't bring "Your page is live." back. */
  useEffect(() => {
    if (liveRows.length > 0) setCelebrate(false);
  }, [liveRows.length]);

  /* "Can't be removed" stops being true once the page is empty again. */
  useEffect(() => {
    if (total === 0) setPageError(null);
  }, [total]);

  /* After "Show", focus moves to the first app it brought in; the button
     that had it is gone. */
  const [focusListing, setFocusListing] = useState<string | null>(null);
  useEffect(() => {
    if (!focusListing) return;
    setFocusListing(null);
    const target = document.querySelector<HTMLElement>(`[data-listing="${CSS.escape(focusListing)}"] a`);
    (target ?? bodyRef.current)?.focus({ preventScroll: !target });
  }, [focusListing]);

  /* ------------------------------------------------------------ actions */

  function showPending() {
    if (!meta || pending.length === 0) return;
    const ids = pending.map((p) => p.id);
    setRows((rs) => [...pending, ...rs]);
    setRevealed((s) => new Set([...s, ...ids]));
    setPending([]);
    setPageError(null);
    writeSeen(meta.id, liveRows.length + pending.length);
    /* The list is newest first, so the newest arrival is its first row. */
    const newest = [...pending].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    setFocusListing(newest?.id ?? null);
  }

  /* The switch answers at once; the server catches up. Only the newest flip
     of a row may settle it, so quick double-taps can't land out of order. */
  function toggle(l: ShowcaseListing, on: boolean) {
    if (!activeCompanyId || !collectionId) return;
    const seq = ++opSeq.current;
    inflight.current.set(l.id, seq);
    const before = rowsRef.current.find((r) => r.id === l.id)?.isPrivate ?? l.isPrivate;
    setRows((rs) => rs.map((r) => (r.id === l.id ? { ...r, isPrivate: !on } : r)));
    showcaseApi.setListingPrivate(activeCompanyId, collectionId, l.id, !on).then(
      (updated) => {
        if (inflight.current.get(l.id) !== seq) return;
        inflight.current.delete(l.id);
        settledAt.current.set(l.id, ++clock.current);
        setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      },
      () => {
        if (inflight.current.get(l.id) !== seq) return;
        inflight.current.delete(l.id);
        settledAt.current.set(l.id, ++clock.current);
        setRows((rs) => rs.map((r) => (r.id === l.id ? { ...r, isPrivate: before } : r)));
        toast.error(on ? `Couldn’t show ${l.name}. Try again.` : `Couldn’t hide ${l.name}. Try again.`);
      },
    );
  }

  /* Approve / reject a request. The reply replaces the row, so an approved
     app moves down into the page and a rejected one stays up with its reason. */
  async function review(l: ShowcaseListing, approve: boolean, reason?: string) {
    if (!activeCompanyId || !collectionId) return;
    setBusy((s) => withId(s, l.id));
    try {
      const updated = approve
        ? await showcaseApi.approveListing(activeCompanyId, collectionId, l.id)
        : await showcaseApi.rejectListing(activeCompanyId, collectionId, l.id, reason);
      settledAt.current.set(l.id, ++clock.current);
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(approve ? `${l.name} is on the page.` : `${l.name} turned down.`);
    } catch (e) {
      if (e instanceof HnsError && e.status === 409) {
        toast.error(`${l.name} was already reviewed.`);
        void refresh(true);
      } else {
        toast.error(`Couldn’t ${approve ? "approve" : "reject"} ${l.name}. Try again.`);
      }
    } finally {
      setBusy((s) => withoutId(s, l.id));
    }
  }

  function askReject(l: ShowcaseListing) {
    /* Uncontrolled: the dialog closes before onConfirm runs, so read the box then. */
    const box = { current: "" };
    setConfirm({
      title: `Turn down ${l.name}?`,
      body: (
        <div className="flex flex-col gap-2">
          <p>{l.creatorName} sees this in their console and can submit again.</p>
          <label className="flex flex-col gap-1 text-[0.85rem] text-foreground">
            Reason (optional)
            <textarea
              rows={3}
              maxLength={500}
              onChange={(e) => (box.current = e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </label>
        </div>
      ),
      cta: "Reject",
      destructive: true,
      dismiss: "Keep waiting",
      onConfirm: () => void review(l, false, box.current.trim() || undefined),
    });
  }

  function askRemove(l: ShowcaseListing) {
    if (!meta) return;
    const own = l.companyId === activeCompanyId;
    const where = meta.type === "event" ? meta.title : "Embarko Showcase";
    const body =
      meta.type === "event"
        ? own
          ? `It comes off ${meta.title} straight away. You can add it again any time.`
          : `It comes off ${meta.title} straight away. The app itself stays live, and ${l.creatorName} can add it again.`
        : "It comes off Embarko Showcase and its Showcase page goes away. The app itself stays live. You can list it again any time.";
    setConfirm({
      title: `Remove ${l.name} from this page?`,
      body,
      cta: "Remove",
      destructive: true,
      dismiss: "Keep it",
      onConfirm: () => void removeListing(l, where),
    });
  }

  async function removeListing(l: ShowcaseListing, where: string) {
    if (!activeCompanyId || !collectionId) return;
    setBusy((s) => withId(s, l.id));
    try {
      await showcaseApi.removeListing(activeCompanyId, collectionId, l.id);
      removedIds.current.add(l.id);
      setRemoving((s) => withId(s, l.id));
      toast.success(`${l.name} removed from ${where}.`);
      /* One fewer app than last seen, and nothing new seen: without this,
         apps that arrive later only to bring the count back up would never
         show as "New apps" on the Showcase tab. */
      if (meta) {
        const seen = readSeen(meta.id);
        if (seen) writeSeen(meta.id, Math.max(0, seen.total - 1), seen.at);
      }
      window.setTimeout(() => {
        /* Focus went back to this row's Remove when the dialog closed; don't
           let it fall to the top of the page when the row goes. */
        const el = document.activeElement;
        if (!el || el === document.body || (el instanceof HTMLElement && el.closest(`[data-listing="${l.id}"]`))) {
          bodyRef.current?.focus({ preventScroll: true });
        }
        setRows((rs) => rs.filter((r) => r.id !== l.id));
        setRemoving((s) => withoutId(s, l.id));
      }, COLLAPSE_MS);
    } catch {
      toast.error(`Couldn’t remove ${l.name}. Try again.`);
    } finally {
      setBusy((s) => withoutId(s, l.id));
    }
  }

  async function copyAddPrompt() {
    if (!meta) return;
    try {
      await navigator.clipboard.writeText(showcaseListPrompt({ slug: meta.slug, title: meta.title, type: "event" }, null, includeCode ? meta.submitCode : null));
      toast.success("Prompt copied. Share it with participants.");
    } catch {
      toast.error("Couldn’t copy. Try again.");
    }
  }

  function askRemovePage() {
    if (!meta) return;
    const m = meta;
    setConfirm({
      title: `Remove ${m.title}?`,
      body: `Its link, posters and QR codes stop working, and someone else could take ${SITE_HOST}/showcase/${m.slug}.`,
      cta: "Remove page",
      destructive: true,
      dismiss: "Keep it",
      onConfirm: () => void removePage(m),
    });
  }

  async function removePage(m: Meta) {
    if (!activeCompanyId) return;
    setPageError(null);
    try {
      await showcaseApi.removeCollection(activeCompanyId, m.id);
      toast.success(`${m.title} removed.`);
      router.push("/app/showcase");
    } catch (e) {
      if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_NOT_EMPTY") {
        setPageError("Someone just added an app, so this page can’t be removed.");
        await refresh(true);
        return;
      }
      toast.error(`Couldn’t remove ${m.title}. Try again.`);
    }
  }

  /* ------------------------------------------------------------- states */

  if (status === "notFound") {
    return (
      <Page>
        <Alert variant="note">
          This showcase page isn’t one of yours, or it was removed.{" "}
          <Link href="/app/showcase" className={cn("font-semibold text-foreground underline underline-offset-2", FOCUS)}>
            Back to Showcase
          </Link>
        </Alert>
      </Page>
    );
  }

  if (status === "error") {
    return (
      <Page>
        <div role="alert">
          <Alert>
            Couldn’t load this page.{" "}
            <LinkButton
              danger
              onClick={() => void load()}
              className={cn("underline underline-offset-2 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center", FOCUS)}
            >
              Try again
            </LinkButton>
          </Alert>
        </div>
      </Page>
    );
  }

  if (status === "loading" || !meta) {
    return (
      <Page>
        <div className="flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-[280px]" />
      </Page>
    );
  }

  const pendingText = pending.length === 1 ? "1 new app just added" : `${pending.length} new apps just added`;
  const pendingLine = pending.length > 0 && (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] text-muted-foreground">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--ok)]" />
      {pendingText}
      <LinkButton onClick={showPending} className={cn("min-h-11 px-1 sm:min-h-0", FOCUS)}>
        Show
      </LinkButton>
    </div>
  );

  const rowsProps = {
    listings: rows.filter((r) => r.status === "approved"),
    activeCompanyId: activeCompanyId ?? "",
    isNew,
    removing,
    busy,
    onToggle: toggle,
    onRemove: askRemove,
  };

  /* Below sm the header's buttons share one row, equal width, at 44px. */
  const headerActions = "flex gap-2.5 [&>*]:h-11 [&>*]:flex-1 sm:shrink-0 sm:[&>*]:h-9 sm:[&>*]:flex-none";
  /* Below sm the meta items stack and their "·" separators go. */
  const metaLine =
    "mt-1.5 flex flex-col items-start gap-1 text-[0.9rem] text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3";
  const dot = (
    <span aria-hidden="true" className="max-sm:hidden">
      ·
    </span>
  );
  /* An empty event page shows the share kit inline, with its own link and
     Copy link. The header then steps back — no second copy button, and
     Open page as outline — so Copy link is the one next step on screen. */
  const kitInline = isEvent && liveRows.length === 0;
  /* null = the public gallery itself, /showcase. */
  const pageLink = (slug: string | null) => (
    /* Wraps so a failed copy's select-it-yourself field gets a row of its own. */
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1">
      <a
        href={slug ? `/showcase/${slug}` : "/showcase"}
        target="_blank"
        rel="noreferrer"
        className={cn("min-w-0 break-all font-mono text-[0.85rem] text-foreground underline-offset-2 hover:underline", FOCUS)}
      >
        {SITE_HOST}/showcase{slug ? `/${slug}` : ""}
      </a>
      {origin && !kitInline && (
        <CopyButton
          iconOnly
          text={`${origin}/showcase${slug ? `/${slug}` : ""}`}
          aria-label="Copy page link"
          announce="Link copied."
          fallbackLabel="Page link to copy"
          variant="ghost"
          className="size-11 shrink-0 text-muted-foreground hover:text-foreground sm:size-8"
        />
      )}
    </span>
  );

  return (
    <Page>
      {isEvent ? (
        /* ------------------------------------------------ event header */
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground">
              {meta.title}
            </h1>
            <div className={metaLine}>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-[var(--ok)]" />
                Live
              </span>
              {dot}
              {pageLink(meta.slug)}
              {dot}
              <span>{countText}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions" className="self-start sm:self-auto">
                <MoreVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={copyAddPrompt}>
                <Copy aria-hidden="true" />
                Copy prompt to add app
              </DropdownMenuItem>
              {/* Only while the page really is empty: the API refuses otherwise. */}
              <DropdownMenuItem variant="destructive" disabled={total > 0} onSelect={askRemovePage}>
                <Trash2 aria-hidden="true" />
                <span className="flex flex-col">
                  Remove this page
                  {total > 0 && <span className="text-xs font-normal text-muted-foreground">Remove its apps first</span>}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
      ) : (
        /* ---------------------------------------------- company header */
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">Embarko Showcase</h1>
            <div className={metaLine}>
              {pageLink(null)}
              {dot}
              <span>{countText}</span>
            </div>
          </div>
        </header>
      )}

      {/* Announced: it answers a Remove that has already closed its dialog. */}
      {pageError && (
        <div role="alert">
          <Alert>{pageError}</Alert>
        </div>
      )}

      {/* Always mounted, so the arrival line is announced when it appears. */}
      <output className="sr-only" aria-live="polite">
        {pending.length > 0 ? `${pendingText}.` : ""}
      </output>

      {/* Focus lands here when a removed row takes the focused control with it. */}
      <div ref={bodyRef} tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {isEvent ? (
          liveRows.length === 0 && requestRows.length === 0 ? (
            /* ------------------------------------- event, nothing yet */
            <>
              {pendingLine}
              <InviteCard
                page={meta}
                origin={origin}
                includeCode={includeCode}
                onIncludeCodeChange={setIncludeCode}
                heading={
                  showCelebration ? (
                  <div className="mb-5 animate-fade-up motion-reduce:animate-none">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="relative flex size-2 shrink-0">
                        <span className="absolute inset-0 animate-[ping_0.9s_cubic-bezier(0,0,0.2,1)_1_forwards] rounded-full bg-[var(--ok)] motion-reduce:hidden" />
                        <span className="relative size-2 rounded-full bg-[var(--ok)]" />
                      </span>
                      <h2
                        ref={celebrateHeading}
                        tabIndex={-1}
                        className="text-[1.6rem] font-extrabold leading-tight tracking-tight text-foreground outline-none"
                      >
                        Your page is <span className="ds-serif">live</span>.
                      </h2>
                    </div>
                    <p className="mt-1.5 text-[0.95rem] text-muted-foreground">
                      Share it, and apps appear here as people add them.
                    </p>
                  </div>
                ) : (
                  <div className="mb-2">
                    <PanelTitle>No apps yet</PanelTitle>
                  </div>
                )
                }
              />
            </>
          ) : (
            /* ------------------------------------------ event, with apps */
            <>
            {/* Stays after the first app arrives: inviting more people, and the
                code that skips review, are still needed. */}
            <InviteCard
              page={meta}
              origin={origin}
              includeCode={includeCode}
              onIncludeCodeChange={setIncludeCode}
              heading={
                <div className="mb-2">
                  <PanelTitle>Invite participants</PanelTitle>
                </div>
              }
            />
            {/* One grid: requests first, badged on their cards, then live apps. */}
            <section className="flex flex-col gap-4">
              <div>
                <PanelTitle>Apps on this page</PanelTitle>
                {requestRows.some((r) => r.status === "pending") && (
                  <p className="mt-1 text-[0.9rem] text-muted-foreground">
                    Apps sent without the code wait for your review. Approve to put them on the page.
                  </p>
                )}
              </div>
              {pendingLine}
              <ListingRows
                variant="event"
                {...rowsProps}
                leading={
                  requestRows.length > 0 && (
                    <RequestRows
                      bare
                      listings={requestRows}
                      busy={busy}
                      onApprove={(l) => void review(l, true)}
                      onReject={askReject}
                      onRemove={askRemove}
                    />
                  )
                }
              />
            </section>
            </>
          )
        ) : liveRows.length === 0 ? (
          /* ------------------------------------- company, nothing listed */
          projects === null && !projectsFailed ? (
            <Skeleton className="h-[240px]" />
          ) : projects && projects.length === 0 ? (
            <EmptyState title="First deploy an app to showcase">
              Show off your apps on Embarko Showcase.
              <div className="mt-5">
                <CopyPromptButton
                  text={showcaseGeneralPrompt()}
                  announce="Prompt copied."
                  copiedChildren={COPIED_LABEL}
                  className={cn(buttonVariants(), "h-11 sm:h-9")}
                >
                  <Copy aria-hidden="true" />
                  Copy deploy prompt
                </CopyPromptButton>
              </div>
            </EmptyState>
          ) : (
            <EmptyState title="None of your apps are on Embarko Showcase yet.">
              List one and it gets its own public page in the gallery.
              <div className="mt-5 flex flex-col items-center gap-2">
                <Button asChild className="h-11 sm:h-9">
                  <Link href="/app/showcase/submit">List an app</Link>
                </Button>
                <CopyPromptButton
                  text={showcaseListPrompt({ slug: meta.slug, title: meta.title, type: "public" })}
                  copiedChildren={COPIED_LABEL}
                  announce="Prompt copied. Paste it in your AI."
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center text-[0.84rem] font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline motion-reduce:transition-none sm:min-h-8",
                    FOCUS,
                  )}
                >
                  Or copy a prompt for your AI
                </CopyPromptButton>
              </div>
            </EmptyState>
          )
        ) : (
          /* ------------------------------------------ company, with apps */
          <section className="flex flex-col gap-4">
            <div>
              <PanelTitle>Your apps on Embarko Showcase</PanelTitle>
            </div>
            {pendingLine}
            <ListingRows variant="company" {...rowsProps} />
          </section>
        )}

        {/* ---------------------------------------- company, not listed yet */}
        {/* Your other apps load after the page itself, so hold their place. */}
        {(isEvent || liveRows.length > 0) && projects === null && !projectsFailed && (
          <section>
            <Skeleton className="h-5 w-44" />
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </section>
        )}
        {unlisted.length > 0 && (
          <section className="border-t border-border pt-6">
            <PanelTitle>{isEvent ? "Your apps not on this page" : "Not on Showcase yet"}</PanelTitle>
            <ul className="mt-2 divide-y divide-border">
              {(showAllUnlisted ? unlisted : unlisted.slice(0, UNLISTED_SHOWN)).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center bg-muted text-sm font-semibold text-foreground"
                  >
                    {(p.name.trim().charAt(0) || "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{p.name}</span>
                  <Button variant="outline" size="sm" className="h-11 sm:h-8" onClick={() => setListTarget(p)} aria-label={`List ${p.name}`}>
                    List it
                  </Button>
                </li>
              ))}
            </ul>
            {!showAllUnlisted && unlisted.length > UNLISTED_SHOWN && (
              <LinkButton onClick={() => setShowAllUnlisted(true)} className={cn("mt-2 min-h-11 sm:min-h-0", FOCUS)}>
                Show all {unlisted.length}
              </LinkButton>
            )}
          </section>
        )}
      </div>

      {(
        <ListOnShowcaseDialog
          project={listTarget}
          companyId={activeCompanyId}
          page={{ slug: meta.slug, title: meta.title, type: isEvent ? "event" : "public" }}
          onClose={() => setListTarget(null)}
          onListed={() => refresh(true)}
        />
      )}

      {isEvent && (
        <Dialog open={shareOpen} onOpenChange={(open) => setShareOpen(open)}>
          <DialogContent className="max-h-[90dvh] w-[calc(100%-32px)] max-w-[760px] overflow-y-auto p-5 sm:p-7">
            <DialogHeader>
              <DialogTitle className="break-words pr-10 leading-tight">Share {meta.title}</DialogTitle>
            </DialogHeader>
            <ShareKit page={meta} />
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}
