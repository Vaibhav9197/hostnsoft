"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, Page, Panel, PanelTitle, Skeleton } from "../../../../components/console/kit";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { projectsApi } from "../../../../lib/hnsApi";
import { useSession } from "../../../../lib/session";
import { useProject } from "../../../../lib/useProject";
import { appHost } from "../../../../lib/site";

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
            <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">{appHost(project.slug)}</code>{" "}
            whatever you call it, so links you have already shared keep working.
          </p>
          <form className="mt-2.5 flex flex-wrap gap-2.5" onSubmit={rename}>
            <Input className="min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="App name" autoFocus />
            <Button type="submit" disabled={savingName || !name.trim() || name.trim() === project.name}>{savingName ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" onClick={() => { setName(project.name); setEditingName(false); }}>Cancel</Button>
          </form>
        </Field>

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
