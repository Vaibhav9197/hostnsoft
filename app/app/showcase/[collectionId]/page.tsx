"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";

import { COPIED_LABEL, CopyPromptButton } from "../../../components/CopyPromptButton";
import { ConfirmDialog, type ConfirmRequest } from "../../../components/console/ConfirmDialog";
import {
  Alert,
  EmptyState,
  LinkButton,
  Page,
  PageHeader,
  Panel,
  PanelTitle,
  Skeleton,
  Tag,
} from "../../../components/console/kit";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { showcaseApi } from "../../../lib/hnsApi";
import { HnsError } from "../../../lib/client";
import { formatDate } from "../../../lib/format";
import { showcaseListPrompt } from "../../../lib/showcasePrompt";
import { useSession } from "../../../lib/session";
import type { ShowcaseCollectionDetail, ShowcaseListing } from "../../../lib/types";
import { SITE_HOST } from "../../../lib/site";

/**
 * One Showcase page, from the side of whoever owns it: your company page,
 * or an event page you created. The owner controls one thing per app —
 * whether it stays visible on the page. Taking an app off Showcase for good
 * is its owner's job, from their own console.
 */

/* One way of getting an app onto the page: what it is, who it is for, the
   button that does it. */
function ShareCard({
  step,
  title,
  body,
  detail,
  action,
}: {
  step: string;
  title: string;
  body: string;
  detail?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-elevated p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-[0.7rem] font-bold leading-none text-foreground">
          {step}
        </span>
        <span className="text-[0.95rem] font-semibold text-foreground">{title}</span>
      </div>
      <p className="flex-1 text-[0.86rem] leading-relaxed text-muted-foreground">{body}</p>
      {detail && <code className="truncate font-mono text-[0.75rem] text-faint">{detail}</code>}
      <div>{action}</div>
    </div>
  );
}

export default function ShowcaseCollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { activeCompanyId } = useSession();
  const router = useRouter();

  const [detail, setDetail] = useState<ShowcaseCollectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [copied, setCopied] = useState<"page" | "link" | null>(null);
  const [busyListing, setBusyListing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId || !collectionId) return;
    setError(null);
    try {
      setDetail(await showcaseApi.getCollection(activeCompanyId, collectionId));
    } catch (e) {
      if (e instanceof HnsError && e.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e instanceof Error ? e.message : "Couldn’t load this page.");
    }
  }, [activeCompanyId, collectionId]);

  useEffect(() => {
    load();
  }, [load]);

  /* The submit form with this page preselected. Built at click time so it
     uses the current origin. */
  function inviteLink(slug: string) {
    return `${window.location.origin}/app/showcase/submit?page=${encodeURIComponent(slug)}`;
  }

  async function copy(kind: "page" | "link") {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(
        kind === "page" ? `${window.location.origin}/showcase/${detail.slug}` : inviteLink(detail.slug)
      );
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  async function setPrivate(listing: ShowcaseListing, isPrivate: boolean) {
    if (!activeCompanyId || !collectionId) return;
    setBusyListing(listing.id);
    setError(null);
    try {
      const updated = await showcaseApi.setListingPrivate(activeCompanyId, collectionId, listing.id, isPrivate);
      setDetail((d) => (d ? { ...d, projects: d.projects.map((p) => (p.id === updated.id ? updated : p)) } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t change visibility.");
    } finally {
      setBusyListing(null);
    }
  }

  function askRemoveListing(listing: ShowcaseListing) {
    setConfirm({
      title: `Remove ${listing.name} from this page?`,
      body: "It comes off this page and the gallery straight away. The app’s owner can add it again if they want to.",
      cta: "Remove from page",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId || !collectionId) return;
        setBusyListing(listing.id);
        setError(null);
        try {
          await showcaseApi.removeListing(activeCompanyId, collectionId, listing.id);
          setDetail((d) =>
            d
              ? {
                  ...d,
                  projects: d.projects.filter((p) => p.id !== listing.id),
                  counts: { total: d.counts.total - 1, publicCount: d.counts.publicCount - (listing.isPrivate ? 0 : 1) },
                }
              : d
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn’t remove that listing.");
        } finally {
          setBusyListing(null);
        }
      },
    });
  }

  function askDelete() {
    if (!detail) return;
    setConfirm({
      title: `Remove ${detail.title}?`,
      body: "The page goes away and its address becomes free for anyone. Only possible while no apps are on it.",
      cta: "Remove page",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId) return;
        try {
          await showcaseApi.removeCollection(activeCompanyId, detail.id);
          router.push("/app/showcase");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn’t remove this page.");
        }
      },
    });
  }

  if (notFound) {
    return (
      <Page>
        <Alert variant="note">
          This Showcase page isn’t one of yours.{" "}
          <Link href="/app/showcase" className="underline">
            Back to Showcase
          </Link>
          .
        </Alert>
      </Page>
    );
  }

  const isEvent = detail?.type === "public";

  return (
    <Page>
      <Link href="/app/showcase" className="text-[0.82rem] text-muted-foreground hover:text-foreground">
        ← Showcase
      </Link>

      <PageHeader
        title={
          detail ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {detail.title}
              {isEvent ? <Tag>Event page</Tag> : <Tag tone="ok">Your company page</Tag>}
            </span>
          ) : (
            <Skeleton className="h-8 w-56" />
          )
        }
        subtitle={
          detail && (
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono">{SITE_HOST}/showcase/{detail.slug}</span>
              <span>
                {detail.counts.total === 0
                  ? "No apps yet"
                  : `${detail.counts.publicCount} of ${detail.counts.total} ${detail.counts.total === 1 ? "app" : "apps"} visible`}
              </span>
            </span>
          )
        }
        actions={
          detail && (
            <>
              {isEvent && detail.counts.total === 0 && (
                <Button variant="ghost" size="sm" onClick={askDelete}>
                  Remove page
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => copy("page")}>
                {copied === "page" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied === "page" ? "Copied" : "Copy page link"}
              </Button>
              <Button asChild size="sm">
                <a href={`/showcase/${detail.slug}`} target="_blank" rel="noreferrer">
                  Open page
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            </>
          )
        }
      />

      {error && <Alert>{error}</Alert>}

      {/* ------------------------------------------------------ sharing */}
      {/* Two ways in, side by side and equally weighted: each is the right
          one for a different participant. The page's own address lives in
          the header, so it is not repeated here. */}
      {detail && (
        <Panel padded className="flex flex-col gap-4">
          <div>
            <PanelTitle>{isEvent ? "Get apps onto this page" : "Add your apps to this page"}</PanelTitle>
            <p className="mt-1 text-[0.9rem] text-muted-foreground">
              {isEvent
                ? "Give participants either of these. Their app appears here the moment they add it."
                : "Either way, the app appears here and in the Showcase gallery straight away."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ShareCard
              step="1"
              title={isEvent ? "Invite link" : "Fill in a short form"}
              body={
                isEvent
                  ? "Participants open it, pick their deployed app and say what it does. About a minute."
                  : "Pick a deployed app and say what it does. Four fields."
              }
              detail={isEvent ? `${SITE_HOST}/app/showcase/submit?page=${detail.slug}` : undefined}
              /* Display only; the copy uses the current origin. */
              action={
                isEvent ? (
                  <Button onClick={() => copy("link")}>
                    {copied === "link" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {copied === "link" ? "Copied" : "Copy invite link"}
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/app/showcase/submit">List an app</Link>
                  </Button>
                )
              }
            />
            <ShareCard
              step="2"
              title={isEvent ? "Prompt for AI agents" : "Let your AI do it"}
              body={
                isEvent
                  ? "For participants building with Claude, Cursor or Codex. Their agent deploys the app and lists it here."
                  : "Paste it into the AI that built the app. It fills in the description, screenshot and tags from the code."
              }
              action={
                <CopyPromptButton
                  text={showcaseListPrompt(detail)}
                  className={buttonVariants({ variant: "outline" })}
                  copiedChildren={
                    <>
                      <Check aria-hidden="true" />
                      {COPIED_LABEL}
                    </>
                  }
                >
                  <Copy aria-hidden="true" />
                  Copy Showcase prompt
                </CopyPromptButton>
              }
            />
          </div>
        </Panel>
      )}

      {/* ---------------------------------------------------------- listings */}
      {/* Rows, not a table: each app is a thing with a name, a maker and a
          one-line description, and the one control that matters here is
          whether it is showing. Hidden rows fade so the page reads at a
          glance like the public one does. */}
      <Panel padded className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <PanelTitle>Apps on this page</PanelTitle>
            <p className="mt-1 text-[0.9rem] text-muted-foreground">
              {isEvent
                ? "Switch an app off to hide it from the public page without removing it. Owners can also take theirs off from their own console."
                : "Switch an app off to hide it from the public page without removing it."}
            </p>
          </div>
          {detail && detail.projects.length > 0 && (
            <span className="text-[0.82rem] text-muted-foreground">
              {detail.counts.publicCount} showing
              {detail.counts.total - detail.counts.publicCount > 0 && ` · ${detail.counts.total - detail.counts.publicCount} hidden`}
            </span>
          )}
        </div>

        {!detail && <Skeleton className="h-[120px]" aria-hidden="true" />}

        {detail && detail.projects.length === 0 && (
          <EmptyState title="No apps here yet">
            {isEvent ? (
              <>
                Share the invite link above. Apps appear here the moment someone adds one.
                <div className="mt-5">
                  <Button onClick={() => copy("link")}>
                    {copied === "link" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {copied === "link" ? "Copied" : "Copy invite link"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                List one of your deployed apps and it appears here straight away.
                <div className="mt-5">
                  <Button asChild>
                    <Link href="/app/showcase/submit">List an app</Link>
                  </Button>
                </div>
              </>
            )}
          </EmptyState>
        )}

        {detail && detail.projects.length > 0 && (
          <ul className="divide-y divide-border">
            {detail.projects.map((p) => {
              const busy = busyListing === p.id;
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0 ${
                    p.isPrivate ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-sm font-semibold text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="truncate font-medium text-foreground">{p.name}</span>
                        <span className="text-[0.8rem] text-muted-foreground">by {p.creatorName}</span>
                        {p.isPrivate && <Tag>Hidden</Tag>}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[0.82rem] text-muted-foreground">{p.tagline}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[0.78rem] text-muted-foreground">
                        <a
                          href={p.appUrl}
                          target="_blank"
                          rel="noreferrer nofollow"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Open app
                          <ArrowUpRight aria-hidden="true" className="size-3" />
                        </a>
                        {!p.isPrivate && (
                          <a
                            href={`/showcase/app/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            Showcase page
                            <ArrowUpRight aria-hidden="true" className="size-3" />
                          </a>
                        )}
                        <span className="text-faint">Added {formatDate(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-[0.82rem] text-muted-foreground">
                      {p.isPrivate ? "Hidden" : "Showing"}
                      <Switch
                        checked={!p.isPrivate}
                        onCheckedChange={(on) => setPrivate(p, !on)}
                        disabled={busy}
                        aria-label={`Show ${p.name} on the page`}
                      />
                    </label>
                    <LinkButton danger disabled={busy} onClick={() => askRemoveListing(p)}>
                      Remove
                    </LinkButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}
