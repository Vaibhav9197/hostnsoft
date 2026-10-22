"use client";

import { useEffect, useState } from "react";
import cronstrue from "cronstrue";
import { Check, History } from "lucide-react";

import { CopyPromptButton, PromptIcon } from "@/app/components/CopyPromptButton";
import { Panel } from "@/app/components/console/kit";
import { ScheduleRunsDialog } from "@/app/components/console/ScheduleRunsDialog";
import { Button } from "@/app/components/ui/button";
import { buttonVariants } from "@/app/components/ui/button";
import { consoleFixSchedulePrompt } from "@/app/lib/deployPrompt";
import { formatDateTime, relativeTime, untilTime } from "@/app/lib/format";
import { schedulesApi } from "@/app/lib/hnsApi";
import { usePermissions } from "@/app/lib/permissions";
import type { Schedule } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

/**
 * The app's scheduled jobs, on its Overview: what runs, when it runs next,
 * and whether the last run worked.
 *
 * Read-only, like the rest of the panel: the AI that built the app changes
 * its jobs (in embarko.json). A failing job gets the one action the panel
 * offers for anything broken, a prompt to hand to that AI.
 *
 * Renders nothing for an app without jobs, so most apps never see it.
 */
export function ProjectSchedules({
  companyId,
  projectId,
  appName,
}: {
  companyId: string | null;
  projectId: string;
  appName: string;
}) {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  // Fixing a job means publishing the app again, which takes full access.
  // Anyone less sees the jobs and how they're doing, not the fix prompt.
  const mayFix = usePermissions().can("app.deploy", projectId);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const load = () =>
      schedulesApi
        .list(companyId, projectId)
        .then((r) => !cancelled && setSchedules(r.schedules))
        // Secondary to the page: if jobs can't load, leave the section out.
        .catch(() => !cancelled && setSchedules((s) => s ?? []));
    void load();
    /* Next run and last run move on their own; a minute is fine-grained
       enough for "in 4m" and cheap enough for a page left open. */
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [companyId, projectId]);

  if (!schedules || schedules.length === 0) return null;

  const failing = schedules.filter((s) => s.failing).length;

  return (
    <section className="flex flex-col gap-3.5">
      <div>
        <h2 className="text-[1.05rem] font-bold text-foreground">Scheduled jobs</h2>
        <p className="mt-0.5 text-[0.85rem] text-muted-foreground">
          {failing > 0
            ? failing === 1
              ? `One of this app's jobs is failing.${mayFix ? " Hand it to your AI to fix." : ""}`
              : `${failing} of this app's jobs are failing.${mayFix ? " Hand them to your AI to fix." : ""}`
            : "Embarko runs these on time, even when nobody is using the app."}
        </p>
      </div>
      <Panel>
        <ul className="divide-y divide-border">
          {schedules.map((s) => (
            <JobRow key={s.id} schedule={s} appName={appName} companyId={companyId!} projectId={projectId} mayFix={mayFix} />
          ))}
        </ul>
      </Panel>
    </section>
  );
}

/** "At 09:00, Monday through Friday (Asia/Kolkata)". Falls back to the raw
 *  expression if it can't be read, which only a hand-edited row could cause. */
function describeTiming(cron: string, timezone: string): string {
  let words: string;
  try {
    words = cronstrue.toString(cron, { use24HourTimeFormat: true, verbose: false });
  } catch {
    words = cron;
  }
  return timezone === "UTC" ? `${words} (UTC)` : `${words} (${timezone.replace(/_/g, " ")})`;
}

function JobRow({
  schedule: s,
  appName,
  companyId,
  projectId,
  mayFix,
}: {
  schedule: Schedule;
  appName: string;
  companyId: string;
  projectId: string;
  mayFix: boolean;
}) {
  const last = s.lastRun;
  const job = s.name ?? s.path;
  const [runsOpen, setRunsOpen] = useState(false);

  return (
    <li className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between", s.failing && "bg-destructive/[0.04]")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[0.95rem] font-semibold text-foreground">{job}</span>
          {s.name && <span className="truncate font-mono text-[0.75rem] text-muted-foreground">{s.path}</span>}
        </div>
        <p className="mt-0.5 text-[0.85rem] text-muted-foreground">{describeTiming(s.cron, s.timezone)}</p>

        {/* Last run, then next run: what happened, then what will. */}
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.82rem]">
          <dt className="text-muted-foreground">Last run</dt>
          <dd className="min-w-0">
            <LastRun schedule={s} />
          </dd>
          <dt className="text-muted-foreground">Next run</dt>
          <dd className="tabular-nums text-foreground">
            {s.enabled && s.nextRunAt ? (
              <span title={formatDateTime(s.nextRunAt)}>{untilTime(s.nextRunAt)}</span>
            ) : (
              <span className="text-muted-foreground">Paused</span>
            )}
          </dd>
        </dl>
      </div>

      <div className="flex shrink-0 flex-wrap items-start gap-2 self-start">
      {/* Every kept run, a page at a time — for "when did this start failing?"
          and "did it run last night?". Only once there is a run to show. */}
      {last && (
        <Button variant="outline" size="sm" className="h-8" onClick={() => setRunsOpen(true)}>
          <History aria-hidden="true" />
          All runs
        </Button>
      )}
      {/* The one action for a broken job: hand it to the AI, with the job and
          its last error already in the prompt. */}
      {s.failing && mayFix && (
        <CopyPromptButton
          text={consoleFixSchedulePrompt({
            appName,
            job,
            path: s.path,
            scheduleId: s.id,
            error: last?.error ?? null,
            reply: last?.responseExcerpt ?? null,
          })}
          className={cn(buttonVariants({ size: "sm" }), "h-8")}
          announce="Prompt copied. Paste it into your AI to fix this job."
          copiedChildren={
            <>
              <Check aria-hidden="true" />
              Paste in your AI
            </>
          }
        >
          <PromptIcon aria-hidden="true" />
          Fix with your AI
        </CopyPromptButton>
      )}
      </div>
      <ScheduleRunsDialog
        open={runsOpen}
        onOpenChange={setRunsOpen}
        companyId={companyId}
        projectId={projectId}
        scheduleId={s.id}
        jobName={job}
      />
    </li>
  );
}

function LastRun({ schedule: s }: { schedule: Schedule }) {
  const last = s.lastRun;
  if (!last) return <span className="text-muted-foreground">Not yet</span>;

  if (last.outcome === "running") return <span className="text-foreground">Running now</span>;

  const when = (
    <span className="tabular-nums text-muted-foreground" title={formatDateTime(last.startedAt)}>
      {relativeTime(last.startedAt)}
    </span>
  );

  if (last.outcome === "ok") {
    return (
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="font-medium text-success">Worked</span>
        {when}
        {last.responseExcerpt && (
          <span className="min-w-0 truncate text-muted-foreground" title={last.responseExcerpt}>
            “{last.responseExcerpt}”
          </span>
        )}
      </span>
    );
  }

  if (last.outcome === "skipped") {
    return (
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium text-foreground">Skipped</span>
        {when}
        <span className="text-muted-foreground">the run before was still going</span>
      </span>
    );
  }

  /* Failed. The reason in plain words first; the app's own reply, if any,
     after it, since that is often the actual explanation. */
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium text-destructive">
          Failed{s.consecutiveFailures > 1 ? ` ${s.consecutiveFailures} times in a row` : ""}
        </span>
        {when}
      </span>
      {(last.error || last.responseExcerpt) && (
        <span className="break-words text-muted-foreground">
          {last.error}
          {last.responseExcerpt && last.responseExcerpt !== last.error ? ` · “${last.responseExcerpt}”` : ""}
        </span>
      )}
    </span>
  );
}
