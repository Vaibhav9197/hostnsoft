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

/* Only the newest few images are kept, so anything older than that has nothing
   left to push out — the API would fail on it minutes later, and a button that
   can only disappoint is worse than no button. Named once because the table and
   the line above it have to agree. */
const REDEPLOYABLE = 3;

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

  /* `quiet` re-reads without blanking the table to a skeleton first. The first
     load has nothing to show and wants the skeleton; the poll below runs once a
     second and would otherwise flash the whole table away between ticks. */
  const load = useCallback(async (quiet = false) => {
    if (!activeCompanyId) return;
    if (!quiet) setDeps(null);
    setError(null);
    try {
      setDeps(await deploymentsApi.list(activeCompanyId, projectId));
    } catch (e) {
      /* A failed poll keeps the table it already has. `error` replaces the
         whole page, and one blip mid-build is not a reason to take the list
         away from someone watching it. The next tick a second later either
         works or the deploy finishes without them. */
      if (!quiet) setError(e instanceof Error ? e.message : "Couldn’t load deployments.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  /* A deploy is not finished when the request that started it comes back — the
     build runs on after it, and the row sits at in_progress until it lands.
     Watching for that here means a re-deploy finishes in front of you, and it
     costs nothing the rest of the time: the condition is read off the list that
     is already on screen, so a page with nothing running never polls.

     Anything in flight counts, not just a re-deploy from this page — a deploy
     an agent started while the tab was open settles the same way.

     Capped rather than left to run: a build that is still going after ten
     minutes is not going to be watched to the end, and an interval nobody is
     looking at is just load on the API. */
  const settling = deps?.some((d) => d.status === "in_progress") ?? false;
  useEffect(() => {
    if (!settling) return;
    const tick = setInterval(() => load(true), 1000);
    const giveUp = setTimeout(() => clearInterval(tick), 10 * 60 * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(giveUp);
    };
  }, [settling, load]);

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

  // Push a deploy's image out again — an earlier one (a rollback) or the one
  // already live (a restart). Both are the same call. The API answers with a
  // new deployment rather than editing the old one, so the only correct thing
  // to do afterwards is reload the list and let it re-render from the server.
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
        setRollbackError(e instanceof Error ? e.message : "Couldn’t re-deploy that.");
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

  /* Counted over successful deploys because a failed one leaves no image
     behind, and the list is already newest-first. */
  const redeployable = new Set(
    deps.filter((d) => d.status === "success").slice(0, REDEPLOYABLE).map((d) => d.id),
  );

  return (
    <Page>
      {/* No page title: the tab above already says "Deployments". The line
          and the log button keep the row the heading used to share. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          The last {REDEPLOYABLE} versions can be re-deployed.
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
              {deps.map((d) => {
                const canRedeploy = redeployable.has(d.id);
                return (
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
                    {/* A deploy that still has an image can be pushed out
                        again, including the one already serving — re-deploying
                        the live image is the ordinary way to restart an app
                        that has got itself stuck, and refusing it here only
                        sends people to their agent for something the panel
                        already does.

                        The live row still *says* Live at rest, because that is
                        the fact somebody came to this page to find. The button
                        takes its place on hover, so the row never shows an
                        action and a status fighting for the same corner — and
                        the chip only steps aside when there is a button to
                        step aside for. */}
                    <span className="relative inline-flex items-center justify-end">
                      {d.id === liveId && (
                        <span
                          className={cn(
                            "transition-opacity",
                            canRedeploy && "group-hover:opacity-0",
                            rollingBack === d.id && "opacity-0",
                          )}
                        >
                          <Tag tone="ok">Live</Tag>
                        </span>
                      )}
                      {canRedeploy && (
                        <Button
                          variant="outline"
                          size="xs"
                          /* A re-deploy is a deliberate act, so it stays out of
                             the way until you're on the row. Revealed on hover
                             and on keyboard focus — opacity rather than
                             `hidden` so the cell keeps its width and rows don't
                             shift. Kept visible mid-flight, when the hover has
                             usually moved on but the button is still saying
                             what it's doing. On the live row it sits over the
                             chip, which is why it is positioned rather than in
                             flow. */
                          className={cn(
                            "opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100",
                            d.id === liveId && "absolute right-0",
                            rollingBack === d.id && "opacity-100",
                          )}
                          disabled={rollingBack !== null}
                          onClick={() => makeLive(d.id)}
                        >
                          {rollingBack === d.id ? "Re-deploying…" : "Re-deploy"}
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
                );
              })}
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
