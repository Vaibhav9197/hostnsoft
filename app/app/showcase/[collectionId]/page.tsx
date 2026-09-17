"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

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
import { Button } from "../../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { showcaseApi } from "../../../lib/hnsApi";
import { HnsError } from "../../../lib/client";
import { formatDate } from "../../../lib/format";
import { useSession } from "../../../lib/session";
import type { ShowcaseCollectionDetail, ShowcaseListing } from "../../../lib/types";

/**
 * One showcase page, organiser's side: address, invite link, listings.
 * The organiser controls one thing per listing — whether it stays public.
 * Withdrawing is the app owner's job, from their own console.
 */
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
      body: "It comes off the page and the gallery straight away. The app’s owner can list it again if they want to.",
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
      title: `Remove /showcase/${detail.slug}?`,
      body: "The page goes away and the slug becomes available to anyone. This is only possible while nothing is listed under it.",
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
          This showcase page doesn’t exist in this company.{" "}
          <Link href="/app/showcase" className="underline">
            Back to Showcase
          </Link>
          .
        </Alert>
      </Page>
    );
  }

  const isBoard = detail?.type === "public";

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
              {isBoard ? <Tag>public board</Tag> : <Tag tone="ok">company page</Tag>}
            </span>
          ) : (
            <Skeleton className="h-8 w-56" />
          )
        }
        subtitle={
          detail && (
            <a
              href={`/showcase/${detail.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:text-foreground"
            >
              /showcase/{detail.slug}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          )
        }
        actions={
          detail && isBoard && detail.counts.total === 0 ? (
            <Button variant="outline" size="sm" onClick={askDelete}>
              Remove page
            </Button>
          ) : undefined
        }
      />

      {error && <Alert>{error}</Alert>}

      {/* ------------------------------------------------------ sharing */}
      {detail && (
        <Panel padded className="flex flex-col gap-4">
          <div>
            <PanelTitle>{isBoard ? "Invite people to list their apps" : "Share your page"}</PanelTitle>
            <p className="mt-1 text-[0.9rem] text-muted-foreground">
              {isBoard ? (
                <>
                  Anyone on Embarko can list a deployed app here: they open <b>Showcase → List an app</b> in
                  their own console and pick this page. The invite link lands them there with it
                  preselected. Listings appear here immediately.
                </>
              ) : (
                <>
                  This is your company’s own page. Only apps from this company can be listed on it — use{" "}
                  <b>List an app</b> to add one.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-elevated px-4 py-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[0.85rem] text-foreground">
                {typeof window === "undefined" ? `/showcase/${detail.slug}` : `${window.location.origin}/showcase/${detail.slug}`}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy("page")}>
                {copied === "page" ? "Copied" : "Copy page link"}
              </Button>
            </div>
            {isBoard && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3">
                <code className="min-w-0 flex-1 break-all font-mono text-[0.8rem] text-muted-foreground">
                  {typeof window === "undefined" ? "" : inviteLink(detail.slug)}
                </code>
                <Button size="sm" onClick={() => copy("link")}>
                  {copied === "link" ? "Copied" : "Copy invite link"}
                </Button>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* ---------------------------------------------------------- listings */}
      <Panel padded className="flex flex-col gap-4">
        <div>
          <PanelTitle>Apps on this page</PanelTitle>
          <p className="mt-1 text-[0.9rem] text-muted-foreground">
            You decide what stays visible on the public page; the app’s owner can withdraw it from their
            own console.
          </p>
        </div>

        {!detail && <Skeleton className="h-[120px]" aria-hidden="true" />}

        {detail && detail.projects.length === 0 && (
          <EmptyState title="Nothing listed yet">
            {isBoard
              ? "Share the invite link above. Apps appear here the moment someone lists one."
              : "Use List an app to put one of your deployed apps here."}
          </EmptyState>
        )}

        {detail && detail.projects.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Public page</TableHead>
                <TableHead>Listed</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.name}</div>
                    <a
                      href={p.appUrl}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="inline-flex items-center gap-1 text-[0.78rem] text-muted-foreground hover:text-foreground"
                    >
                      Open app
                      <ArrowUpRight aria-hidden="true" className="size-3" />
                    </a>
                    {!p.isPrivate && (
                      <>
                        <span className="px-1.5 text-[0.78rem] text-faint">·</span>
                        <a
                          href={`/showcase/app/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[0.78rem] text-muted-foreground hover:text-foreground"
                        >
                          Showcase page
                        </a>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.creatorName}</TableCell>
                  <TableCell className="text-[0.85rem]">
                    {p.isPrivate ? (
                      <span className="text-muted-foreground">Hidden</span>
                    ) : (
                      <span className="text-success">Visible</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{formatDate(p.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-4">
                      <LinkButton disabled={busyListing === p.id} onClick={() => setPrivate(p, !p.isPrivate)}>
                        {p.isPrivate ? "Show on page" : "Hide from page"}
                      </LinkButton>
                      <LinkButton danger disabled={busyListing === p.id} onClick={() => askRemoveListing(p)}>
                        Remove
                      </LinkButton>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}
