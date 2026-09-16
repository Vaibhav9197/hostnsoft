"use client";

import { use, useCallback, useEffect, useState } from "react";
import { StatusPill } from "../../../../components/console/StatusPill";
import { Alert, EmptyState, Fact, FactGrid, Page, Panel, Skeleton, Tag } from "../../../../components/console/kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../../../components/ui/sheet";
import { Button } from "../../../../components/ui/button";
import { appsApi, deploymentsApi } from "../../../../lib/hnsApi";
import { useProject } from "../../../../lib/useProject";
import { relativeTime } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import { cn } from "../../../../lib/utils";
import type { AppLogs, Deployment, LogStream } from "../../../../lib/types";

export default function DeploymentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const [deps, setDeps] = useState<Deployment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const { project } = useProject(activeCompanyId, projectId);
  const [logsOpen, setLogsOpen] = useState(false);
  const [stream, setStream] = useState<LogStream>("stdout");
  const [logs, setLogs] = useState<AppLogs | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setDeps(null);
    setError(null);
    try {
      setDeps(await deploymentsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load deployments.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Logs are app-level — one running allocation, not one per deploy — which is
     why they get their own sheet rather than living inside a deploy's detail.
     Fetched per slug and stream, and only while that sheet is open. */
  const slug = project?.slug ?? null;
  useEffect(() => {
    if (!slug || !logsOpen) return;
    let live = true;
    setLogs(null);
    setLogsError(null);
    appsApi
      .logs(slug, stream)
      .then((r) => { if (live) setLogs(r); })
      .catch((e) => { if (live) setLogsError(e instanceof Error ? e.message : "Couldn’t load logs."); });
    return () => { live = false; };
  }, [slug, stream, logsOpen]);

  // Roll an earlier deploy back into service. The API answers with a new
  // deployment rather than editing the old one, so the only correct thing to do
  // afterwards is reload the list and let it re-render from the server.
  const makeLive = useCallback(
    async (deploymentId: string) => {
      if (!activeCompanyId) return;
      setRollingBack(deploymentId);
      setRollbackError(null);
      try {
        await deploymentsApi.rollback(activeCompanyId, projectId, deploymentId);
        await load();
        setSelected(null);
      } catch (e) {
        setRollbackError(e instanceof Error ? e.message : "Couldn’t make that deploy live.");
      } finally {
        setRollingBack(null);
      }
    },
    [activeCompanyId, projectId, load],
  );

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!deps) return <Page><Skeleton className="h-[200px]" aria-hidden="true" /></Page>;

  const active = deps.find((d) => d.id === selected) ?? null;

  /* The API marks the serving deploy with isCurrent, so this is read rather
     than worked out. Falling back to nothing if no row claims it is
     deliberate: with no live row every successful deploy keeps its button,
     which is the old behaviour and loses nobody their way back. */
  const liveId = deps.find((d) => d.isCurrent)?.id ?? null;

  return (
    <Page>
      {/* No page title: the tab above already says "Deployments". The line
          and the log button keep the row the heading used to share. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          Every deploy attempt, newest first.
        </p>
        <Button variant="outline" onClick={() => { setSelected(null); setLogsOpen(true); }}>
          Last deploy log
        </Button>
      </div>

      {rollbackError && <Alert>{rollbackError}</Alert>}

      {deps.length === 0 && (
        <EmptyState title="No deployments yet">
          Deploys triggered by <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">embarko-deploy</code> show up here.
        </EmptyState>
      )}

      {deps.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deploy</TableHead><TableHead>Status</TableHead><TableHead>App version</TableHead>
                <TableHead>Memory</TableHead><TableHead>By</TableHead><TableHead>When</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deps.map((d) => (
                <TableRow
                  key={d.version}
                  className={cn("group cursor-pointer", active?.id === d.id && "bg-primary/10 shadow-[inset_3px_0_0_var(--accent)]")}
                  onClick={() => { setLogsOpen(false); setSelected(active?.id === d.id ? null : d.id); }}
                >
                  <TableCell className="font-mono">{d.version}</TableCell>
                  <TableCell><StatusPill status={d.status} /></TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{d.appVersion}</TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{d.memoryMb != null ? `${d.memoryMb} MB` : "—"}</TableCell>
                  <TableCell>{d.triggeredBy ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(d.createdAt)}</TableCell>
                  {/* Clicking the row opens the detail panel, so the button has
                      to stop the click from bubbling into that toggle. */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {/* The running deploy is marked, not offered. "Make this
                        live" on the row that already is reads as though it
                        would change something, and the page otherwise never
                        said which one was serving traffic — so this replaces
                        an action that did nothing with the fact you came to
                        find. */}
                    {d.id === liveId ? (
                      <Tag tone="ok">Live</Tag>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        /* Rollback is a rare, deliberate act, so it stays out of
                           the way until you're on the row. Revealed on hover and
                           on keyboard focus — opacity rather than `hidden` so the
                           cell keeps its width and rows don't shift. Kept visible
                           mid-rollback, when the hover has usually moved on but
                           the button is still saying what it's doing. */
                        className={cn(
                          "opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100",
                          rollingBack === d.id && "opacity-100",
                        )}
                        /* A deploy that never succeeded has no image to flip to
                           — the API would answer 422, so don't offer it. */
                        disabled={d.status !== "success" || rollingBack !== null}
                        onClick={() => makeLive(d.id)}
                      >
                        {rollingBack === d.id ? "Making live…" : "Make this live"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* Detail lives in a side sheet rather than under the table: the row
          you clicked stays where it was instead of the page growing beneath
          it. Non-modal and backdrop-free on purpose — the table stays live, so
          clicking a different row swaps the sheet's contents instead of
          closing it and making you click twice. */}
      <Sheet modal={false} open={active !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent
          showOverlay={false}
          /* Radix closes a non-modal dialog on any outside interaction, which
             would fight the row-to-row switching above. Close is the X, Esc,
             or clicking the open row again. */
          onInteractOutside={(e) => e.preventDefault()}
          className="gap-0 shadow-2xl sm:max-w-xl"
        >
          {active && (
            <>
              <SheetHeader className="p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <SheetTitle>Deploy {active.version}</SheetTitle>
                  <StatusPill status={active.status} />
                </div>
                <SheetDescription>{relativeTime(active.createdAt)}</SheetDescription>
              </SheetHeader>
              <div className="shrink-0 px-5 pb-5">
                {active.errorDetail && <Alert className="mb-3">{active.errorDetail}</Alert>}
                <FactGrid flush>
                  <Fact flush k="App version" v={active.appVersion} mono />
                  <Fact flush k="Image tag" v={active.imageTag ?? "—"} mono />
                  <Fact flush k="Memory" v={active.memoryMb != null ? `${active.memoryMb} MB` : "—"} mono />
                  <Fact flush k="Triggered by" v={active.triggeredBy ?? "—"} />
                  <Fact flush k="Started" v={relativeTime(active.createdAt)} />
                  <Fact flush k="Finished" v={active.finishedAt ? relativeTime(active.finishedAt) : "—"} />
                </FactGrid>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Logs live in their own sheet: the endpoint reports the app's current
          allocation, so they belong to the app rather than to any row in the
          table above. */}
      <Sheet modal={false} open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent
          showOverlay={false}
          onInteractOutside={(e) => e.preventDefault()}
          className="gap-0 shadow-2xl sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 p-5 pb-3">
            <SheetTitle>App logs</SheetTitle>
            <SheetDescription>
              The running app’s most recent output — not tied to any one deploy.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
            <div className="mb-2.5 flex shrink-0 items-center gap-1">
              {(["stdout", "stderr"] as const).map((s) => (
                <Button
                  key={s}
                  variant={stream === s ? "secondary" : "ghost"}
                  size="xs"
                  className="font-mono"
                  onClick={() => setStream(s)}
                >
                  {s}
                </Button>
              ))}
            </div>

            {logsError && <Alert>{logsError}</Alert>}
            {!logsError && logs === null && <Skeleton className="min-h-0 flex-1" aria-hidden="true" />}
            {!logsError && logs?.available === false && (
              <p className="text-[0.85rem] text-muted-foreground">{logs.reason}</p>
            )}
            {!logsError && logs?.available === true && (
              logs.logs.trim() === "" ? (
                <p className="text-[0.85rem] text-muted-foreground">Nothing on {stream} yet.</p>
              ) : (
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-elevated p-3 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
                  {logs.logs}
                </pre>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>

    </Page>
  );
}
