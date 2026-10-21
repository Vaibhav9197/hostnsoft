"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, type ConfirmRequest } from "../../../../components/console/ConfirmDialog";
import { Alert, NativeSelect, Page, Panel, PanelTitle, Skeleton } from "../../../../components/console/kit";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { HnsError } from "../../../../lib/client";
import { projectsApi } from "../../../../lib/hnsApi";
import { useSession } from "../../../../lib/session";
import { refreshProjects, useProject } from "../../../../lib/useProject";
import { usePermissions } from "../../../../lib/permissions";
import { APP_DOMAIN, appHost } from "../../../../lib/site";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId, activeCompany, companies, setActiveCompanyId } = useSession();
  const { project, error, reload } = useProject(activeCompanyId, projectId);
  // Hide what the person's role can't do here (permissions.tsx); the API
  // refuses it regardless.
  const { can } = usePermissions();
  const canChange = can("app.settings", projectId);
  const canDelete = can("app.delete", projectId);
  const router = useRouter();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  /* The name reads as plain text until asked for. Settings is somewhere you
     come to check what the app is called far more often than to change it, and
     a page of open inputs invites edits nobody came to make. */
  const [editingName, setEditingName] = useState(false);

  /* The web address, same read-until-asked treatment as the name. Kept as its
     own field rather than folded into the rename: changing it breaks every
     link to the app, so it needs its own confirmation and its own errors. */
  const [slug, setSlug] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  /* Inline rather than a toast. Every failure here is something to fix in the
     field that is still open ("that name is taken"), and a toast slides away
     while you are re-reading the input. */
  const [slugError, setSlugError] = useState<string | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  /* Moving to another workspace. Only the person's other workspaces are
     offered — the API refuses any other target, and a list they can't use
     would only invite the refusal. */
  const otherWorkspaces = companies.filter((c) => c.companyId !== activeCompanyId);
  const [moveTarget, setMoveTarget] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setSlug(project.slug);
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

  /* Waits out a move that is already running, resolving to null on success
     or to a sentence to show the user. Polls because the move outlasts any
     single request: it can take minutes, and the proxy in front of the API
     gives up after ten seconds.

     A 404 means the server has forgotten the move, which for us is a
     success: it only forgets finished ones, and a failure would still be
     remembered. Anything still in progress when we stop polling is reported
     as "still going" rather than as a failure, because it is neither. */
  async function awaitSlugChange(companyId: string, id: string): Promise<string | null> {
    const deadline = Date.now() + 6 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const status = await projectsApi.slugChangeStatus(companyId, id);
        if (status.state === "succeeded") return null;
        if (status.state === "failed") return status.reason ?? "Couldn’t move your app.";
      } catch (e) {
        if (e instanceof HnsError && e.status === 404) return null;
        /* A blip while polling says nothing about the move itself, which is
           running on the server either way. Keep waiting. */
      }
    }
    return "Your app is taking longer than usual to move. Refresh in a minute to see where it got to.";
  }

  /* Why a confirmation and not just a Save: this is the one setting on the
     page whose old value other people may be holding. Nothing redirects, so
     the moment it changes the old address is simply gone. */
  function askChangeSlug(e: React.FormEvent) {
    e.preventDefault();
    const next = slug.trim().toLowerCase();
    if (!project || next === project.slug) return;
    setSlugError(null);
    setConfirmReq({
      title: `Move this app to ${appHost(next)}?`,
      body: (
        <>
          <p>
            <code className="font-mono">{appHost(project.slug)}</code> stops working
            straight away — there is no redirect, and the old address becomes
            available for someone else to take. Anything pointing at it needs
            updating: links you have shared, and the app name in any CI job or
            saved agent prompt that deploys this app.
          </p>
          {/* Said plainly because it is an outage, and someone who reads
              "changing a setting" will not expect one. What makes it slow —
              stopping the app to move its stored data, then waiting on a
              certificate for the new address — is not the user's problem;
              how long they will be down, and that it is safe, is. */}
          {hasDeployed && (
            <p className="mt-2">
              Your app will be <strong className="font-medium text-foreground">offline for a
                few minutes</strong> while it moves, and it keeps everything it has
              stored. Leave this page open. If anything goes wrong it is put
              back exactly as it was.
            </p>
          )}
        </>
      ),
      cta: hasDeployed ? "Move the app" : "Change address",
      destructive: true,
      onConfirm: () => changeSlug(next),
    });
  }

  async function changeSlug(next: string) {
    if (!activeCompanyId) return;
    setSavingSlug(true);
    setSlugError(null);
    try {
      const result = await projectsApi.changeSlug(activeCompanyId, projectId, next);

      /* An app that never deployed is already done here. A live one has only
         been accepted — moving it takes minutes, far longer than any request
         in front of this survives, so the server hands back a 202 and the
         outcome has to be collected separately. */
      if (result && "moving" in result) {
        const outcome = await awaitSlugChange(activeCompanyId, projectId);
        if (outcome) {
          setSlugError(outcome);
          return;
        }
      }

      toast.success("Web address updated", { description: `Your app is now at ${appHost(next)}` });
      setEditingSlug(false);
      /* Not this page's reload(): the sidebar fetches the project separately
         and shows the address twice (live-URL link, deploy prompt), so it
         would sit on the old one until a navigation. This re-fetches every
         mounted useProject, including ours. */
      refreshProjects();
    } catch (e) {
      setSlugError(e instanceof Error ? e.message : "Couldn’t change the web address.");
    } finally {
      setSavingSlug(false);
    }
  }

  /* Confirmed because people outside this workspace gain the app and people in
     it lose it — and because any agent or automated deploy using a "Whole
     workspace" token from here stops reaching it. Said in those terms; the
     app itself is untouched, which is the reassuring half. */
  function askMove() {
    const target = otherWorkspaces.find((c) => c.companyId === moveTarget);
    if (!project || !target) return;
    setMoveError(null);
    setConfirmReq({
      title: `Move ${project.name} to ${target.companyName}?`,
      body: (
        <>
          <p>
            It keeps running at <code className="font-mono">{appHost(project.slug)}</code> with
            everything it has — nothing is redeployed and nobody visiting it will notice.
            From now on it is managed in <strong className="font-medium text-foreground">{target.companyName}</strong>,
            and people who are only in {activeCompany?.companyName ?? "this workspace"} can no longer see it.
          </p>
          <p className="mt-2">
            AI agents using a <strong className="font-medium text-foreground">Whole workspace</strong> token
            from {activeCompany?.companyName ?? "this workspace"} will stop reaching it. A{" "}
            <strong className="font-medium text-foreground">Just me</strong> token keeps working for anyone
            who is in {target.companyName}.
          </p>
        </>
      ),
      cta: "Move app",
      onConfirm: () => move(target.companyId, target.companyName),
    });
  }

  async function move(targetId: string, targetName: string) {
    if (!activeCompanyId) return;
    setMoving(true);
    setMoveError(null);
    try {
      await projectsApi.move(activeCompanyId, projectId, targetId);
      toast.success(`Moved to ${targetName}`, { description: "Your app is live at the same address." });
      /* Follow the app: it now only exists in the other workspace, so staying
         here would leave this page pointing at nothing. Same id there. */
      setActiveCompanyId(targetId);
      refreshProjects();
      router.push(`/app/projects/${projectId}`);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "Couldn’t move the app.");
      setMoving(false);
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

  /* `currentDeploymentId` rather than `status`: status is null only until the
     first attempt, and a FAILED attempt still leaves nothing running, so this
     tells apart the two kinds of address change. For an app that never
     deployed it is instant; for a live one it is a migration with real
     downtime. This tracks what the API checks. */
  const hasDeployed = Boolean(project?.currentDeploymentId);

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
          locked={!canChange}
          onEdit={() => { setName(project.name); setEditingName(true); }}
        >
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            This is the name you see here. Changing it leaves your app at{" "}
            <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">{appHost(project.slug)}</code>,
            so links you have already shared keep working. The web address is a
            separate setting below.
          </p>
          <form className="mt-2.5 flex flex-wrap gap-2.5" onSubmit={rename}>
            <Input className="min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="App name" autoFocus />
            <Button type="submit" disabled={savingName || !name.trim() || name.trim() === project.name}>{savingName ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" onClick={() => { setName(project.name); setEditingName(false); }}>Cancel</Button>
          </form>
        </Field>

        <Field
          label="Web address"
          value={appHost(project.slug)}
          editing={editingSlug}
          locked={!canChange}
          onEdit={() => { setSlug(project.slug); setSlugError(null); setEditingSlug(true); }}
        >
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            Where your app is served, and the app name you deploy with. Lowercase
            letters, digits and hyphens.{" "}
            {hasDeployed
              ? "Moving a live app takes it offline for a few minutes, so it’s limited to one change a week."
              : "Changing it now is instant, because this app hasn’t deployed yet."}
          </p>
          <form className="mt-2.5 flex flex-wrap items-center gap-2.5" onSubmit={askChangeSlug}>
            <Input
              className="min-w-[220px] flex-1"
              value={slug}
              /* Lowercased as you type because the address genuinely is
                 lowercase; everything else is left alone so the server's
                 rules are what you see, rather than input that silently
                 rewrites itself under the cursor. */
              onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugError(null); }}
              maxLength={63}
              aria-label="App web address"
              aria-invalid={slugError ? true : undefined}
              autoFocus
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <span className="font-mono text-[0.9rem] text-muted-foreground">.{APP_DOMAIN}</span>
            <Button type="submit" disabled={savingSlug || !slug.trim() || slug.trim() === project.slug}>
              {savingSlug ? (hasDeployed ? "Moving…" : "Saving…") : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setSlug(project.slug); setSlugError(null); setEditingSlug(false); }}>Cancel</Button>
          </form>
          {slugError && <Alert className="mt-2.5">{slugError}</Alert>}
        </Field>

      </Panel>

      {/* Only when there is somewhere to move it and their role here allows
          it. Someone in a single workspace has no use for the control, and
          showing it would just be one more thing on the page to read past.
          The target workspace's own check (may they add apps there?) is the
          API's: a refusal shows in moveError. */}
      {otherWorkspaces.length > 0 && can("app.move", projectId) && (
        <Panel padded>
          <PanelTitle>Move to another workspace</PanelTitle>
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            Hand this app to another workspace you’re in. It stays live at the same
            address, with its settings, domains and history.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <NativeSelect
              className="min-w-[220px] flex-1"
              aria-label="Workspace to move this app to"
              value={moveTarget}
              onChange={(e) => { setMoveTarget(e.target.value); setMoveError(null); }}
              disabled={moving}
            >
              <option value="">Choose a workspace…</option>
              {otherWorkspaces.map((c) => (
                <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
              ))}
            </NativeSelect>
            <Button variant="outline" disabled={moving || !moveTarget} onClick={askMove}>
              {moving ? "Moving…" : "Move app"}
            </Button>
          </div>
          {moveError && <Alert className="mt-2.5">{moveError}</Alert>}
        </Panel>
      )}

      {/* Only for someone who may delete this app — a Developer without that
          right can still delete apps they added themselves. */}
      {canDelete && (
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
      )}

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
  locked,
  children,
}: {
  label: string;
  value: string;
  /** A quiet line under the value — context about the thing, not about
   *  editing it, so it stays out of the way while the form is open. */
  hint?: React.ReactNode;
  editing: boolean;
  onEdit: () => void;
  /** Read-only for good: hides the pencil rather than offering an edit the
   *  server is always going to refuse. The `hint` should say why. */
  locked?: boolean;
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
            {!locked && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${label.toLowerCase()}`}
                className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {hint && <p className="mt-1 text-[0.78rem] text-faint">{hint}</p>}
        </>
      )}
    </div>
  );
}
