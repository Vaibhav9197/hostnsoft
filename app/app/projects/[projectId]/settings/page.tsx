"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Plus } from "lucide-react";
import { ConfirmDialog, type ConfirmRequest } from "../../../../components/console/ConfirmDialog";
import { Alert, LinkButton, Page, Panel, PanelTitle, Skeleton } from "../../../../components/console/kit";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { projectsApi, showcaseApi } from "../../../../lib/hnsApi";
import { formatDate } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import { useProject } from "../../../../lib/useProject";
import type { ShowcaseListing, ShowcasePage } from "../../../../lib/types";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const { project, error, reload } = useProject(activeCompanyId, projectId);
  const router = useRouter();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  /* The name reads as plain text until asked for. Settings is somewhere you
     come to check what the app is called far more often than to change it, and
     a page of open inputs invites edits nobody came to make. */
  const [editingName, setEditingName] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  /* Where this app is on Showcase. Removing takes effect at once. */
  const [listings, setListings] = useState<ShowcaseListing[] | null>(null);
  const [showcaseErr, setShowcaseErr] = useState<string | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  /* The company's own page, named so the panel can say where the app is. */
  const [companyPage, setCompanyPage] = useState<ShowcasePage | null>(null);
  const companyListing = listings?.find((l) => l.collection.type === "company") ?? null;
  const boardListings = listings?.filter((l) => l.collection.type !== "company") ?? null;

  const loadListings = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const [mine, pages] = await Promise.all([
        showcaseApi.listMySubmissions(activeCompanyId, projectId),
        showcaseApi.listPages(activeCompanyId),
      ]);
      setListings(mine);
      setCompanyPage(pages.find((p) => p.type === "company") ?? null);
    } catch (e) {
      setListings([]);
      setShowcaseErr(e instanceof Error ? e.message : "Couldn’t load showcase listings.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  function askWithdraw(l: ShowcaseListing) {
    setConfirmReq({
      title: `Remove ${l.name} from ${l.collection.type === "company" ? "Showcase" : l.collection.title}?`,
      body: "Its public page goes away straight away. You can list it again any time.",
      cta: "Remove",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId) return;
        try {
          await showcaseApi.withdraw(activeCompanyId, l.id);
          await loadListings();
          toast.success("Listing removed");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn’t remove that listing.");
        }
      },
    });
  }

  useEffect(() => {
    if (project) {
      setName(project.name);
    }
  }, [project]);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSavingName(true);
    try {
      await projectsApi.rename(activeCompanyId, projectId, name.trim());
      toast.success("Name updated", { description: "Your app’s web address is unchanged." });
      setEditingName(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t rename the app.");
    } finally {
      setSavingName(false);
    }
  }

  async function del() {
    if (!activeCompanyId) return;
    setDeleting(true);
    try {
      await projectsApi.remove(activeCompanyId, projectId);
      toast.success(`${project?.name ?? "The app"} removed`);
      router.push("/app");
    } catch (e) {
      /* Longer than a success: this one leaves the reader with a decision to
         make, and it must not vanish while they are still reading it. */
      toast.error(e instanceof Error ? e.message : "Couldn’t remove the app.", { duration: 10000 });
      setDeleting(false);
    }
  }

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!project) {
    /* Shaped like the three panels that follow. The old single h-40 block was
       a fifth of the real height, so the page visibly jumped on load. */
    return (
      <Page>
        <span className="sr-only" role="status">Loading settings…</span>
        <Skeleton className="h-[260px]" aria-hidden="true" />
        <Skeleton className="h-[150px]" aria-hidden="true" />
        <Skeleton className="h-[160px]" aria-hidden="true" />
      </Page>
    );
  }

  return (
    <Page>
      {/* No title and no lead-in: the tab above says "Settings", and each panel
          below explains itself. A sentence defining the page by what it is not
          only asked the reader to think about deploying before they could work
          out what they were looking at. */}
      {/* No panel title: "This app" named the panel after the page it is on,
          which told the reader nothing they didn't already know. The fields
          label themselves. */}
      <Panel padded>
        <Field
          label="Name"
          value={project.name}
          /* Sits with the name because that is how someone identifies this app
             when they write to us — "walkover-uk1, id cmtsfe…" — rather than
             as a fact of its own further down the page. */
          hint={
            <>
              App ID:{" "}
              <span className="font-mono text-muted-foreground">{project.id}</span>
            </>
          }
          editing={editingName}
          onEdit={() => { setName(project.name); setEditingName(true); }}
        >
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            This is the name you see here. Your app stays at{" "}
            <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">{project.slug}.app.embarko.ai</code>{" "}
            whatever you call it, so links you have already shared keep working.
          </p>
          <form className="mt-2.5 flex flex-wrap gap-2.5" onSubmit={rename}>
            <Input className="min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="App name" autoFocus />
            <Button type="submit" disabled={savingName || !name.trim() || name.trim() === project.name}>{savingName ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" onClick={() => { setName(project.name); setEditingName(false); }}>Cancel</Button>
          </form>
        </Field>

      </Panel>

      <Panel padded>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PanelTitle>Showcase</PanelTitle>
            <p className="mt-1 text-[0.92rem] text-muted-foreground">
              Show this app in{" "}
              <a href="/showcase" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Embarko’s public gallery
              </a>
              . It gets a page of its own and appears on your company page.
            </p>
          </div>
          {listings && listings.length === 0 && (
            <Button asChild size="sm">
              <Link href={`/app/showcase/submit?app=${encodeURIComponent(projectId)}&from=settings`}>
                <Plus aria-hidden="true" />
                List on Showcase
              </Link>
            </Button>
          )}
          {/* Already listed: an app can also sit on event pages, so the door
              stays open. Aimed at the company page first if it is not there yet. */}
          {listings && listings.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/app/showcase/submit?app=${encodeURIComponent(projectId)}&from=settings${companyListing ? "&where=event" : ""}`}
              >
                <Plus aria-hidden="true" />
                {companyListing ? "Add to an event page" : "Add to your company page"}
              </Link>
            </Button>
          )}
        </div>
        {showcaseErr && <Alert className="mt-3">{showcaseErr}</Alert>}
        {listings === null && <Skeleton className="mt-4 h-10" aria-hidden="true" />}
        {listings && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <p className="text-[0.92rem] font-medium text-foreground">
                {listings.length === 0
                  ? "Not on Showcase"
                  : companyListing
                    ? companyListing.isPrivate
                      ? "On Showcase, hidden on your company page"
                      : "On Showcase"
                    : `On ${boardListings![0].collection.title}`}
              </p>
              <p className="text-[0.8rem] text-muted-foreground">
                {listings.length === 0
                  ? "Takes a minute. You say what it does; it’s live straight away."
                  : "Live in the gallery" + (companyPage && companyListing ? ` and at embarko.ai/showcase/${companyPage.slug}` : "")}
              </p>
            </div>
          </div>
        )}
        {listings && listings.length > 0 && (
          <ul className="mt-2 divide-y divide-border">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[0.85rem] text-foreground">
                    {l.collection.type === "company" ? "Your company page" : l.collection.title}
                    {l.collection.type !== "company" && <span className="text-muted-foreground"> · event page</span>}
                  </p>
                  <p className="text-[0.8rem] text-muted-foreground">
                    {l.isPrivate ? "Hidden by the organiser" : "Visible"}
                    {" · added "}
                    {formatDate(l.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {!l.isPrivate && (
                    <a
                      href={`/showcase/app/${l.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                    >
                      View page
                      <ArrowUpRight aria-hidden="true" className="size-3" />
                    </a>
                  )}
                  <LinkButton danger onClick={() => askWithdraw(l)}>
                    Remove
                  </LinkButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel padded tone="danger">
        <PanelTitle tone="danger">Remove this app</PanelTitle>
        {/* Removal is not instant: the app is taken off the list first and shut
            down afterwards. Said plainly here so nobody is surprised by a URL
            that still answers a few minutes later. */}
        <p className="mt-1 text-[0.92rem] text-muted-foreground">
          This can’t be undone, and it isn’t instant —{" "}
          <b className="text-foreground">your app keeps running for a while</b> before it is permanently removed.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <Input
            className="min-w-[220px] flex-1"
            placeholder={`Type “${project.name}” to confirm`}
            aria-label={`Type the app name, ${project.name}, to confirm removal`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button variant="destructive" disabled={deleting || confirm !== project.name} onClick={del}>{deleting ? "Removing…" : "Remove app"}</Button>
        </div>
      </Panel>

      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </Page>
  );
}

/**
 * One setting, shown as its value until someone asks to change it.
 *
 * The pencil is a real button rather than a hover affordance: on a touch screen
 * there is no hover, and an edit control nobody can find is the same as no edit
 * control at all.
 */
function Field({
  label,
  value,
  hint,
  editing,
  onEdit,
  children,
}: {
  label: string;
  value: string;
  /** A quiet line under the value — context about the thing, not about
   *  editing it, so it stays out of the way while the form is open. */
  hint?: React.ReactNode;
  editing: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    /* The divider separates one field from the previous one, so the first in a
       panel goes without — otherwise it draws a line against the panel's own
       top edge. */
    <div className="mt-5 border-t border-border pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <p className="text-[0.92rem] font-medium text-foreground">{label}</p>
      {editing ? (
        children
      ) : (
        <>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[0.95rem] text-foreground">{value}</span>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${label.toLowerCase()}`}
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          {hint && <p className="mt-1 text-[0.78rem] text-faint">{hint}</p>}
        </>
      )}
    </div>
  );
}
