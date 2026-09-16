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
import type { ShowcaseListing } from "../../../../lib/types";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const { project, error, reload } = useProject(activeCompanyId, projectId);
  const router = useRouter();

  const [name, setName] = useState("");
  const [memory, setMemory] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingMem, setSavingMem] = useState(false);
  /* Validation, not an outcome: this one belongs under the input it is about,
     where the reader is already looking, rather than in a toast that appears
     in the corner after nothing has happened. Outcomes go to toasts. */
  const [memErr, setMemErr] = useState<string | null>(null);
  /* Both fields read as plain text until asked for. Settings is somewhere you
     come to check what the app is called far more often than to change it, and
     a page of open inputs invites edits nobody came to make. */
  const [editingName, setEditingName] = useState(false);
  const [editingMem, setEditingMem] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  /* Where this app is showcased. Withdrawing removes the listing at once. */
  const [listings, setListings] = useState<ShowcaseListing[] | null>(null);
  const [showcaseErr, setShowcaseErr] = useState<string | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const loadListings = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      setListings(await showcaseApi.listMySubmissions(activeCompanyId, projectId));
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
      setMemory(String(project.memoryMb));
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

  async function saveMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    const mb = Number(memory);
    if (!Number.isInteger(mb) || mb <= 0) {
      setMemErr("Memory has to be a whole number greater than 0.");
      return;
    }
    setMemErr(null);
    setSavingMem(true);
    try {
      await projectsApi.setMemory(activeCompanyId, projectId, mb);
      toast.success("Memory saved", {
        description: "It applies the next time your AI deploys — nothing changes right now.",
      });
      setEditingMem(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t save the memory setting.");
    } finally {
      setSavingMem(false);
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
      {/* No page title: the tab above already says "Settings". */}
      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
        Everything about {project.name} that isn’t deploying it.
      </p>

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

        <Field
          label="Memory"
          value={`${project.memoryMb} MB`}
          editing={editingMem}
          onEdit={() => { setMemory(String(project.memoryMb)); setMemErr(null); setEditingMem(true); }}
        >
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            How much room your app has to work in. Most apps are happy at 256 MB — raise it only if yours
            runs into trouble. A new number takes effect the next time your AI deploys.
          </p>
          {/* noValidate so our own message shows instead of the browser's
              bubble: that bubble is unstyled, vanishes on the next click, and
              isn't tied to the field by aria-describedby. The rules it would
              have enforced are enforced in saveMemory instead. */}
          <form className="mt-2.5 flex flex-wrap gap-2.5" onSubmit={saveMemory} noValidate>
            <Input
              className="min-w-[220px] flex-1 font-mono"
              type="number"
              min={1}
              value={memory}
              onChange={(e) => { setMemory(e.target.value); setMemErr(null); }}
              aria-label="Memory in MB"
              aria-invalid={!!memErr || undefined}
              aria-describedby={memErr ? "memory-error" : undefined}
              autoFocus
            />
            <Button type="submit" disabled={savingMem || memory === String(project.memoryMb)}>{savingMem ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" onClick={() => { setMemory(String(project.memoryMb)); setMemErr(null); setEditingMem(false); }}>Cancel</Button>
          </form>
          {memErr && (
            <p id="memory-error" className="mt-1.5 text-[0.82rem] text-destructive">
              {memErr}
            </p>
          )}
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
        {listings && listings.length === 0 && (
          <p className="mt-4 text-[0.92rem] text-muted-foreground">Not showcased anywhere yet.</p>
        )}
        {listings && listings.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {listings.map((l) => (
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
