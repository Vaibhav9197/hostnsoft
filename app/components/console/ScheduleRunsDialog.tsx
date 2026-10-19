"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Alert, NativeSelect } from "@/app/components/console/kit";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { formatDateTime, relativeTime } from "@/app/lib/format";
import { schedulesApi } from "@/app/lib/hnsApi";
import type { ScheduleRun, ScheduleRunsPage } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

const PAGE_SIZE = 20;

type Outcome = "" | "ok" | "failed" | "skipped";
type Trigger = "" | "schedule" | "manual";

/**
 * Every kept run of one scheduled job, newest first, a page at a time, with
 * the two filters people reach for: "only the failures" and "only the runs it
 * did on its own". Opened from the job's row on the app's Overview.
 *
 * Read-only, like the rest of the jobs section. Embarko keeps the last
 * `kept` runs per job; the footer says so, so an empty older page isn't a
 * surprise.
 */
export function ScheduleRunsDialog({
  open,
  onOpenChange,
  companyId,
  projectId,
  scheduleId,
  jobName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  projectId: string;
  scheduleId: string;
  jobName: string;
}) {
  const [outcome, setOutcome] = useState<Outcome>("");
  const [trigger, setTrigger] = useState<Trigger>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ScheduleRunsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    schedulesApi
      .runs(companyId, projectId, scheduleId, {
        page,
        limit: PAGE_SIZE,
        outcome: outcome || undefined,
        trigger: trigger || undefined,
      })
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError("Couldn't load the runs. Try again in a moment."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, companyId, projectId, scheduleId, page, outcome, trigger]);

  // A filter change starts again from the newest runs.
  const changeOutcome = (v: Outcome) => {
    setOutcome(v);
    setPage(1);
  };
  const changeTrigger = (v: Trigger) => {
    setTrigger(v);
    setPage(1);
  };

  const filtered = outcome !== "" || trigger !== "";
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-[min(820px,calc(100vw-2rem))] grid-rows-[auto_auto_1fr_auto] overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle>Runs of {jobName}</DialogTitle>
          <DialogDescription>Newest first. What the app replied is shown for each run.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`runs-outcome-${scheduleId}`}>Result</label>
          <NativeSelect
            id={`runs-outcome-${scheduleId}`}
            value={outcome}
            onChange={(e) => changeOutcome(e.target.value as Outcome)}
            className="h-9 py-1.5"
          >
            <option value="">All results</option>
            <option value="ok">Worked</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </NativeSelect>
          <label className="sr-only" htmlFor={`runs-trigger-${scheduleId}`}>Started by</label>
          <NativeSelect
            id={`runs-trigger-${scheduleId}`}
            value={trigger}
            onChange={(e) => changeTrigger(e.target.value as Trigger)}
            className="h-9 py-1.5"
          >
            <option value="">On schedule and test runs</option>
            <option value="schedule">On schedule only</option>
            <option value="manual">Test runs only</option>
          </NativeSelect>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOutcome("");
                setTrigger("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="min-h-0 overflow-auto rounded-lg border border-border">
          {error ? (
            <Alert className="m-3">{error}</Alert>
          ) : !data ? (
            <p className="px-4 py-10 text-center text-muted-foreground">Loading runs…</p>
          ) : data.runs.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted-foreground">
              {filtered ? "No runs match these filters." : "This job hasn't run yet."}
            </p>
          ) : (
            <Table className={cn("min-w-[600px]", loading && "opacity-60")}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">When</TableHead>
                  <TableHead className="w-[110px]">Result</TableHead>
                  <TableHead className="w-[110px]">Started by</TableHead>
                  <TableHead className="w-[80px] text-right">Took</TableHead>
                  <TableHead>App replied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.runs.map((r) => (
                  <RunRow key={r.id} run={r} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[0.82rem] text-muted-foreground">
          <span className="tabular-nums">
            {data && data.total > 0
              ? `${first}–${last} of ${data.total} run${data.total === 1 ? "" : "s"}${filtered ? " matching" : ""}`
              : ""}
            {data && <span className="ml-2">· Embarko keeps the last {data.kept} runs of each job.</span>}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data || data.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft aria-hidden="true" />
              Newer
            </Button>
            <span className="tabular-nums">
              Page {data?.page ?? page} of {data?.totalPages ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || data.page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const RESULT: Record<ScheduleRun["outcome"], { label: string; className: string }> = {
  ok: { label: "Worked", className: "text-success" },
  failed: { label: "Failed", className: "text-destructive" },
  skipped: { label: "Skipped", className: "text-muted-foreground" },
  running: { label: "Running", className: "text-foreground" },
};

function RunRow({ run: r }: { run: ScheduleRun }) {
  const result = RESULT[r.outcome];
  /* For a failure, the reason first and the app's own words after it; for
     anything else, just what the app said. */
  const reply =
    r.outcome === "failed"
      ? [r.error, r.responseExcerpt && r.responseExcerpt !== r.error ? `“${r.responseExcerpt}”` : null].filter(Boolean).join(" · ")
      : r.outcome === "skipped"
        ? r.error
        : r.responseExcerpt;

  return (
    <TableRow className={cn(r.outcome === "failed" && "bg-destructive/[0.04]")}>
      <TableCell className="whitespace-nowrap tabular-nums" title={formatDateTime(r.startedAt)}>
        <span className="text-foreground">{relativeTime(r.startedAt)}</span>
        <span className="block text-[0.75rem] text-muted-foreground">{formatDateTime(r.startedAt)}</span>
      </TableCell>
      <TableCell className={cn("font-medium", result.className)}>
        {result.label}
        {r.httpStatus != null && <span className="ml-1.5 font-mono text-[0.75rem] text-muted-foreground">{r.httpStatus}</span>}
      </TableCell>
      <TableCell className="text-muted-foreground">{r.trigger === "manual" ? "Test run" : "On schedule"}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {r.durationMs != null ? (r.durationMs < 1000 ? `${r.durationMs} ms` : `${(r.durationMs / 1000).toFixed(1)} s`) : "—"}
      </TableCell>
      <TableCell className="max-w-[320px] break-words text-muted-foreground">{reply || "—"}</TableCell>
    </TableRow>
  );
}
