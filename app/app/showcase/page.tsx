"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";

import { ConfirmDialog, type ConfirmRequest } from "../../components/console/ConfirmDialog";
import { Alert, EmptyState, LinkButton, Page, PageHeader, Panel, PanelTitle, Skeleton, Tag } from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { showcaseApi } from "../../lib/hnsApi";
import { HnsError } from "../../lib/client";
import { formatDate } from "../../lib/format";
import { useSession } from "../../lib/session";
import type { ShowcaseCollection, ShowcaseListing } from "../../lib/types";

/**
 * Showcase, from a company's side. Two roles, two halves:
 *   Your pages — the company's own page (its apps only) and any public
 *   boards it created (open to everyone's apps, live at once).
 *   Your listed apps — this company's apps listed on any page.
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

export default function ShowcasePage() {
  const { activeCompanyId } = useSession();
  const [collections, setCollections] = useState<ShowcaseCollection[] | null>(null);
  const [mine, setMine] = useState<ShowcaseListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setError(null);
    try {
      const [c, m] = await Promise.all([
        showcaseApi.listCollections(activeCompanyId),
        showcaseApi.listMySubmissions(activeCompanyId),
      ]);
      setCollections(c);
      setMine(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load Showcase.");
      setCollections([]);
      setMine([]);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  /* The slug follows the title until the person edits it by hand — the
     common case is "Walkover 2026" → walkover-2026 with no extra typing. */
  function onTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugFrom(value));
  }

  const slugValid = slug.length >= 3 && SLUG_RULE.test(slug);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !slugValid || !title.trim()) return;
    setCreating(true);
    setFormError(null);
    try {
      await showcaseApi.createCollection(activeCompanyId, { slug, title: title.trim() });
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setShowForm(false);
      await load();
    } catch (e) {
      if (e instanceof HnsError && e.code === "SHOWCASE_SLUG_TAKEN") {
        setFormError(`/showcase/${slug} is already taken. Try another slug.`);
      } else {
        setFormError(e instanceof Error ? e.message : "Couldn’t create that page.");
      }
    } finally {
      setCreating(false);
    }
  }

  function askRemove(c: ShowcaseCollection) {
    setConfirm({
      title: `Remove /showcase/${c.slug}?`,
      body: "The page is removed and the slug becomes available to anyone. Only possible while nothing is listed under it.",
      cta: "Remove page",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId) return;
        try {
          await showcaseApi.removeCollection(activeCompanyId, c.id);
          await load();
        } catch (e) {
          if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_NOT_EMPTY") {
            setError("Apps are listed on that page, so it can’t be removed.");
          } else {
            setError(e instanceof Error ? e.message : "Couldn’t remove that.");
          }
        }
      },
    });
  }

  function askWithdraw(l: ShowcaseListing) {
    setConfirm({
      title: `Take ${l.name} off /showcase/${l.collection.slug}?`,
      body: "It disappears from that page and the gallery straight away. You can list it again any time.",
      cta: "Withdraw listing",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId) return;
        try {
          await showcaseApi.withdraw(activeCompanyId, l.id);
          await load();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn’t withdraw that.");
        }
      },
    });
  }

  const companyPage = collections?.find((c) => c.type === "company") ?? null;
  const boards = collections?.filter((c) => c.type === "public") ?? [];

  function PageRow({ c }: { c: ShowcaseCollection }) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-foreground">{c.title}</span>
            {c.type === "company" ? <Tag tone="ok">your company page</Tag> : <Tag>public board</Tag>}
          </div>
          <a
            href={`/showcase/${c.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-mono text-[0.8rem] text-muted-foreground hover:text-foreground"
          >
            /showcase/{c.slug}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
          <p className="mt-2 text-[0.85rem] text-muted-foreground">
            {c.counts.publicCount} live · {c.counts.total} listed · created {formatDate(c.createdAt)}
            {c.type === "company" && " · only your own apps can be listed here"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/showcase/${c.id}`}>Manage</Link>
          </Button>
          {c.type === "public" && c.counts.total === 0 && (
            <LinkButton danger onClick={() => askRemove(c)}>
              Remove
            </LinkButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Showcase"
        subtitle="Your company’s public page, public boards you run, and your deployed apps listed anywhere on Showcase."
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

      {/* ------------------------------------------------------ your pages */}
      <Panel padded className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PanelTitle>Your showcase pages</PanelTitle>
            <p className="mt-1 text-[0.9rem] text-muted-foreground">
              Every company has its own page at /showcase/&lt;slug&gt;. Create a public board for a hackathon or
              demo day — it’s live at once, and anyone on Embarko can list their deployed apps there.
            </p>
          </div>
          {!showForm && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" />
              New public board
            </Button>
          )}
        </div>

        {collections === null && <Skeleton className="h-[80px]" aria-hidden="true" />}

        {showForm && (
          <form className="flex flex-col gap-3 rounded-md border border-border p-4" onSubmit={create}>
            <div className="flex flex-wrap gap-2.5">
              <Input
                className="min-w-[220px] flex-1"
                placeholder="Board title — e.g. Walkover Hackathon 2026"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
                maxLength={80}
                autoFocus
              />
              <div className="flex min-w-[260px] flex-1 items-center gap-0 rounded-md border border-input px-3 font-mono text-sm">
                <span className="shrink-0 text-muted-foreground">/showcase/</span>
                <input
                  className="h-9 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
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
              <Button type="submit" disabled={creating || !slugValid || !title.trim()}>
                {creating ? "Creating…" : "Create page"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-[0.82rem] text-muted-foreground">
              Lowercase letters, digits and dashes; at least 3 characters. The slug is the page’s
              address and can’t be changed later.
            </p>
            {formError && <Alert>{formError}</Alert>}
          </form>
        )}

        {companyPage && <PageRow c={companyPage} />}
        {collections !== null && !companyPage && (
          <p className="text-[0.85rem] text-muted-foreground">
            Your company page is being set up — sign out and back in if it doesn’t appear.
          </p>
        )}
        {boards.map((c) => (
          <div key={c.id} className="border-t border-border pt-4">
            <PageRow c={c} />
          </div>
        ))}
      </Panel>

      {/* ------------------------------------------------- your listed apps */}
      <Panel padded className="flex flex-col gap-4">
        <div>
          <PanelTitle>Your listed apps</PanelTitle>
          <p className="mt-1 text-[0.9rem] text-muted-foreground">
            Deployed apps from this company that a member has listed on a showcase page.
          </p>
        </div>

        {mine === null && <Skeleton className="h-[80px]" aria-hidden="true" />}

        {mine && mine.length === 0 && (
          <EmptyState title="Nothing listed yet">
            Use <b>List an app</b> above to put one of your deployed apps on your company page or on a
            public board.
          </EmptyState>
        )}

        {mine && mine.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Listed on</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Listed</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{l.name}</div>
                    <a
                      href={l.appUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[0.78rem] text-muted-foreground hover:text-foreground"
                    >
                      {l.appUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/showcase/${l.collection.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[0.8rem] hover:underline"
                    >
                      /showcase/{l.collection.slug}
                      <ArrowUpRight aria-hidden="true" className="size-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-[0.85rem]">
                    {l.isPrivate ? (
                      <span className="text-muted-foreground">Hidden by organiser</span>
                    ) : (
                      <a href={`/showcase/apps/${l.slug}`} target="_blank" rel="noreferrer" className="text-success hover:underline">
                        Live
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{formatDate(l.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <LinkButton danger onClick={() => askWithdraw(l)}>
                      Withdraw
                    </LinkButton>
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
