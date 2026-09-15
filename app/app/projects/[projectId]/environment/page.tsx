"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Alert, EmptyState, LinkButton, Page, PageHeader, Panel, Skeleton } from "../../../../components/console/kit";
import { BulkEnvDialog } from "../../../../components/console/BulkEnvDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { deploymentsApi, envVarsApi } from "../../../../lib/hnsApi";
import { ENV_VAR_KEY } from "../../../../lib/envFile";
import { relativeTime } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import type { Deployment, EnvVar } from "../../../../lib/types";

export default function EnvironmentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const [vars, setVars] = useState<EnvVar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<React.ReactNode>(null);
  /* Kept apart from `notice`: this one answers the Apply changes button and belongs
     beside it, while saving a variable is confirmed up next to the form that
     did it. One shared slot put every message at the top of the page, far from
     whichever control the reader had just pressed. */
  const [deployNotice, setDeployNotice] = useState<React.ReactNode>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  // The newest deploy that actually built — the version a re-deploy puts back
  // into service. Null while loading, or if nothing has ever built.
  const [latest, setLatest] = useState<Deployment | null>(null);
  const [redeploying, setRedeploying] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editAllOpen, setEditAllOpen] = useState(false);
  // The row being edited inline, and its in-progress value. Null when no row
  // is open for editing.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  // The key awaiting a confirmed removal. Null when no prompt is open.
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  /* Whether a variable has been added, edited or removed in this visit — the
     only thing Apply changes is for.
     Deliberately not derived from the data: comparing each variable's
     updatedAt against the running deploy's createdAt looks like the more
     honest signal, but a deploy writes its own variables after its record is
     created, so an untouched app reads as permanently pending and the button
     is back to being furniture. */
  const [pending, setPending] = useState(false);

  const trimmedKey = key.trim();
  // Only complain once something has been typed — an empty box isn't wrong
  // yet, it's just empty, and the Save button is already disabled for it.
  const keyInvalid = trimmedKey !== "" && !ENV_VAR_KEY.test(trimmedKey);
  // What they probably meant: the usual cause is a dash or a dot from a
  // copied name, or a leading digit.
  const suggestedKey = trimmedKey.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(?=\d)/, "_");

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setVars(null);
    setError(null);
    try {
      setVars(await envVarsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load variables.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Which deploy a re-deploy would reuse. Its own failure isn't worth an error
  // banner on a page about variables — the button just stays disabled.
  useEffect(() => {
    if (!activeCompanyId) return;
    let stale = false;
    deploymentsApi
      .list(activeCompanyId, projectId)
      .then((ds) => {
        if (!stale) setLatest(latestSuccessful(ds));
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [activeCompanyId, projectId]);

  // Apply the saved variables to the running app. There's no "redeploy" call,
  // so this rolls the newest successful deploy back into service: the same
  // image, no rebuild, but restarted with the variables as they stand now.
  async function redeploy() {
    if (!activeCompanyId || !latest) return;
    setRedeploying(true);
    setError(null);
    setNotice(null);
    setDeployNotice(null);
    try {
      await deploymentsApi.rollback(activeCompanyId, projectId, latest.id);
      /* The variables are on their way to the app, so there is nothing left to
         apply — until the next edit. */
      setPending(false);
      /* Points at Deployments rather than the live URL: until this finishes,
         the app on that URL is still the old one, so the build is the thing
         worth watching. */
      setDeployNotice(
        <>
          {/* Only the status word carries the colour. A whole sentence in green
              is harder to read than one in body text, and a green link is
              indistinguishable from the green around it. */}
          <b className="font-medium text-success">Deployment started</b> — it may take a little while.{" "}
          <Link className="underline underline-offset-2" href={`/app/projects/${projectId}/deployments`}>
            Check the deployment status
          </Link>
          .
        </>,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t apply the changes.");
    } finally {
      setRedeploying(false);
    }
  }

  async function upsert(e: React.FormEvent) {
    e.preventDefault();
    // Guards the Enter key, which submits regardless of the button's state.
    if (!activeCompanyId || !trimmedKey || keyInvalid) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Bulk-upsert endpoint; we send a single pair. Existing keys omitted are left as-is.
      await envVarsApi.set(activeCompanyId, projectId, [{ key: trimmedKey, value }]);
      setPending(true);
      setNotice(`${trimmedKey} saved. Applies on the next deploy.`);
      setDeployNotice(null);
      setKey("");
      setValue("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the variable.");
    } finally {
      setBusy(false);
    }
  }

  // Same bulk-upsert endpoint the single-pair form uses; the dialog has
  // already parsed and shown what's about to be sent. Errors are thrown back
  // for the dialog to display, since that's where the paste still is.
  //
  // `removedKeys` is only ever non-empty from the edit dialog, where the box
  // stands for the whole set. The upsert endpoint is a merge and can't express
  // a deletion, so removals are separate DELETEs — done after the writes, so a
  // failure part-way leaves the new values saved rather than the old ones gone.
  async function saveBulk(incoming: { key: string; value: string }[], removedKeys: string[] = []) {
    if (!activeCompanyId) return;
    if (incoming.length > 0) await envVarsApi.set(activeCompanyId, projectId, incoming);
    for (const key of removedKeys) {
      await envVarsApi.remove(activeCompanyId, projectId, key);
    }
    setPending(true);
    const saved = incoming.length;
    const removed = removedKeys.length;
    setNotice(
      `${[
        saved > 0 && `${saved} variable${saved === 1 ? "" : "s"} saved`,
        removed > 0 && `${removed} removed`,
      ]
        .filter(Boolean)
        .join(", ")}. Apply changes to send them to the running app.`,
    );
    setError(null);
    await load();
  }

  // Inline edit of one value. The key can't change here — renaming a variable
  // is a delete plus an add, which the edit-all dialog expresses honestly and
  // a text box on a row does not.
  function startEdit(v: EnvVar) {
    setEditingKey(v.key);
    setEditingValue(v.value);
    setRevealed((r) => ({ ...r, [v.key]: true }));
  }

  async function saveEdit() {
    if (!activeCompanyId || editingKey === null) return;
    const key = editingKey;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await envVarsApi.set(activeCompanyId, projectId, [{ key, value: editingValue }]);
      setPending(true);
      setEditingKey(null);
      setNotice(`${key} updated. Applies on the next deploy.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t update the variable.");
    } finally {
      setBusy(false);
    }
  }

  // Only called once the removal is confirmed. Optimistic, rolling the row
  // back into the list if the delete doesn't land.
  async function remove(k: string) {
    if (!activeCompanyId) return;
    setConfirmRemove(null);
    /* The old message names a variable that may be the one just removed —
       "FOO saved" above a list with no FOO in it is a straight contradiction. */
    setNotice(null);
    const prev = vars;
    setVars((v) => (v ?? []).filter((x) => x.key !== k));
    try {
      await envVarsApi.remove(activeCompanyId, projectId, k);
      setPending(true);
    } catch (e) {
      setVars(prev ?? null);
      setError(e instanceof Error ? e.message : "Couldn’t remove the variable.");
    }
  }

  return (
    <Page>
      <PageHeader title="App setup" subtitle="Settings and secrets your app runs with." />

      {/* The paste dialog already rejects bad names line by line; this form
          didn't, so a name like FOO-BAR only failed after a round trip, as a
          generic validation error with no hint at which part was wrong. */}
      <form className="flex flex-col gap-1.5" onSubmit={upsert}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            className="min-w-[140px] flex-1 font-mono"
            placeholder="KEY"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            aria-invalid={keyInvalid || undefined}
            aria-describedby={keyInvalid ? "env-key-error" : undefined}
          />
          <Input className="min-w-[140px] flex-1 font-mono" placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button type="submit" disabled={busy || !trimmedKey || !value || keyInvalid}>Save</Button>
          <Button type="button" variant="outline" onClick={() => setBulkOpen(true)}>Add in bulk</Button>
        </div>
        {keyInvalid && (
          <p id="env-key-error" className="text-[0.82rem] text-destructive">
            Names use letters, digits and underscores, and can’t start with a digit — so{" "}
            <span className="font-mono">{trimmedKey}</span> won’t work. Try{" "}
            <span className="font-mono">{suggestedKey}</span>.
          </p>
        )}
      </form>

      <BulkEnvDialog open={bulkOpen} onOpenChange={setBulkOpen} onSave={saveBulk} />
      <BulkEnvDialog
        open={editAllOpen}
        onOpenChange={setEditAllOpen}
        onSave={saveBulk}
        mode="edit"
        existing={vars ?? []}
      />

      {/* A deleted variable can't be recovered — the value isn't stored
          anywhere else — so removal asks first. */}
      <Dialog open={confirmRemove !== null} onOpenChange={(next) => !next && setConfirmRemove(null)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              Remove <span className="font-mono">{confirmRemove}</span>?
            </DialogTitle>
            <DialogDescription>
              The stored value is deleted and can’t be recovered. The running app keeps using it until the next
              deploy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmRemove && remove(confirmRemove)}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="info" className="text-foreground">{notice}</Alert>}

      {!vars && !error && <Skeleton className="h-[140px]" aria-hidden="true" />}

      {vars && vars.length === 0 && (
        <EmptyState title="No variables">Add config and secrets above.</EmptyState>
      )}

      {vars && vars.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.92rem] text-muted-foreground">
            {vars.length} variable{vars.length === 1 ? "" : "s"}
          </p>
          {/* Editing one value is a row action; this is for reordering,
              renaming or clearing out several at once, where a text block
              beats a row at a time. */}
          <Button variant="outline" size="sm" onClick={() => setEditAllOpen(true)}>
            Edit all
          </Button>
        </div>
      )}

      {vars && vars.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Key</TableHead><TableHead>Value</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {vars.map((v) => (
                <TableRow key={v.key}>
                  <TableCell className="font-mono">{v.key}</TableCell>
                  <TableCell className="max-w-[340px] font-mono">
                    {editingKey === v.key ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <Input
                          className="min-w-[180px] flex-1 font-mono"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditingKey(null);
                          }}
                          aria-label={`Value for ${v.key}`}
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEdit} disabled={busy}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)} disabled={busy}>
                          Cancel
                        </Button>
                      </span>
                    ) : !revealed[v.key] ? (
                      <span className="inline-flex items-center gap-2 text-faint">
                        <Lock className="size-[13px]" />
                        ••••••••
                        <LinkButton onClick={() => setRevealed((r) => ({ ...r, [v.key]: true }))}>reveal</LinkButton>
                      </span>
                    ) : (
                      <span className="inline-flex items-center break-all">
                        {v.value}
                        <LinkButton className="ml-2.5" onClick={() => setRevealed((r) => ({ ...r, [v.key]: false }))}>hide</LinkButton>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(v.updatedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {editingKey !== v.key && (
                      <>
                        <LinkButton onClick={() => startEdit(v)}>Edit</LinkButton>
                        <LinkButton danger className="ml-3.5" onClick={() => setConfirmRemove(v.key)}>
                          Remove
                        </LinkButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* The button only means something once a variable has changed: an app
          already running the saved values has nothing to apply, and a button
          that sits there permanently reads as a thing you are supposed to
          press. The notice outlives it, so the confirmation doesn't vanish
          along with the button that produced it. */}
      {(deployNotice || pending) && (
        <div className="flex flex-col items-start gap-2.5">
          {/* Above the button, not below it: the button can scroll out of view on
              a short screen, and a confirmation the reader has to hunt for is one
              they will assume never appeared. */}
          {deployNotice && <Alert variant="note" className="w-full text-foreground">{deployNotice}</Alert>}
          {pending && (
            <>
              {/* Reuses the image the latest deploy already built, so this is a
                  restart with the current variables, not a rebuild — seconds, and
                  the code stays exactly where it is. */}
              <Button variant="outline" onClick={redeploy} disabled={redeploying || !latest}>
                {redeploying ? "Applying…" : "Apply changes"}
              </Button>
              {latest && (
                <p className="text-[0.8rem] text-faint">
                  Restarts the latest version, <span className="font-mono">{latest.appVersion}</span> ({latest.version}),
                  with your saved variables. No rebuild — the running code doesn’t change.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Page>
  );
}

/* The newest deploy that actually built. Only a "success" is a candidate: a
   "failed" one has no image and a rollback onto it answers 422, and an
   "in_progress" one has nothing finished to reuse yet. The list arrives
   newest-first today, but this is the one place where taking the wrong row
   restarts the app on the wrong code, so pick by timestamp instead of
   trusting the order. */
function latestSuccessful(deployments: Deployment[]): Deployment | null {
  return (
    deployments
      .filter((d) => d.status === "success")
      .reduce<Deployment | null>(
        (newest, d) =>
          newest === null || Date.parse(d.createdAt) > Date.parse(newest.createdAt) ? d : newest,
        null,
      ) ?? null
  );
}
