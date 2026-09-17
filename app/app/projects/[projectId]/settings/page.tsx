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
import { Switch } from "../../../../components/ui/switch";
import { projectsApi, showcaseApi } from "../../../../lib/hnsApi";
import { formatDate } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import { useProject } from "../../../../lib/useProject";
import type { ShowcaseListing, ShowcasePage } from "../../../../lib/types";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId, activeCompany, user } = useSession();
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

  /* Where this app is showcased. Withdrawing removes the listing at once. */
  const [listings, setListings] = useState<ShowcaseListing[] | null>(null);
  const [showcaseErr, setShowcaseErr] = useState<string | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  /* The company's own page: a single switch, no form. The listing is built
     from the app's name, so there is nothing to ask for. */
  const [companyPage, setCompanyPage] = useState<ShowcasePage | null>(null);
  const [toggling, setToggling] = useState(false);
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

  async function toggleCompanyShowcase(on: boolean) {
    if (!activeCompanyId || !project) return;
    setToggling(true);
    try {
      if (on) {
        if (!companyPage) throw new Error("Your company page isn’t ready yet. Try again in a moment.");
        await showcaseApi.submit(activeCompanyId, {
          collectionSlug: companyPage.slug,
          projectId,
          name: project.name,
          tagline: project.name,
          creatorName: (user?.name?.trim() || activeCompany?.companyName || "Embarko user").slice(0, 80),
        });
        toast.success("Showcased on your company page");
      } else if (companyListing) {
        await showcaseApi.withdraw(activeCompanyId, companyListing.id);
        toast.success("Removed from your company page");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t update the showcase.");
    } finally {
      await loadListings();
      setToggling(false);
    }
  }

  function askWithdraw(l: ShowcaseListing) {
    setConfirmReq({
      title: `Remove ${l.name} from /showcase/${l.collection.slug}?`,
      body: "It disappears from that page and the gallery straight away. You can list it again any time.",
      cta: "Remove listing",
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
              Where this app is listed on Embarko Showcase.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/showcase/submit">
              <Plus aria-hidden="true" />
              List on a page
            </Link>
          </Button>
        </div>
        {showcaseErr && <Alert className="mt-3">{showcaseErr}</Alert>}
        {listings === null && <Skeleton className="mt-4 h-10" aria-hidden="true" />}
        {listings && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <label htmlFor="company-showcase" className="text-[0.92rem] font-medium text-foreground">
                Show on your company page
              </label>
              <p className="text-[0.8rem] text-muted-foreground">
                {companyPage ? (
                  <a
                    href={`/showcase/${companyPage.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono hover:underline"
                  >
                    /showcase/{companyPage.slug}
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                  </a>
                ) : (
                  "Your company’s public page"
                )}
                {" · uses the app’s name, nothing to fill in"}
                {companyListing?.isPrivate && " · hidden by organiser"}
              </p>
            </div>
            <Switch
              id="company-showcase"
              checked={companyListing !== null}
              onCheckedChange={toggleCompanyShowcase}
              disabled={toggling || (!companyListing && !companyPage)}
              aria-label="Show on your company page"
            />
          </div>
        )}
        {boardListings && boardListings.length === 0 && (
          <p className="mt-4 text-[0.8rem] text-muted-foreground">Not on any public board.</p>
        )}
        {boardListings && boardListings.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {boardListings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <a
                    href={`/showcase/${l.collection.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[0.85rem] hover:underline"
                  >
                    /showcase/{l.collection.slug}
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                  </a>
                  <p className="text-[0.8rem] text-muted-foreground">
                    {l.collection.title}
                    {l.collection.type === "company" ? " · your company page" : " · public board"}
                    {" · "}
                    {l.isPrivate ? "hidden by organiser" : "live"}
                    {" · listed "}
                    {formatDate(l.createdAt)}
                  </p>
                </div>
                <LinkButton danger onClick={() => askWithdraw(l)}>
                  Remove
                </LinkButton>
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
