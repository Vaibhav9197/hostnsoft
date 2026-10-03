"use client";

import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Alert, Fact, FactGrid, Skeleton } from "./kit";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import type { ChartConfig } from "../ui/chart";
import { HnsError } from "../../lib/client";
import { ANALYTICS_UNAVAILABLE, analyticsApi } from "../../lib/hnsApi";
import type { AnalyticsRange, ProjectAnalytics as Analytics } from "../../lib/types";

/**
 * Traffic and resource usage for one app — GET /companies/:c/projects/:p/analytics.
 *
 * The one distinction this component exists to preserve: a 503 means the
 * analytics pipeline itself is unreachable, while an app nobody has visited
 * answers 200 with zeroes. Rendering the first as "no traffic" would tell the
 * owner their app is idle when it may be busy, so the two states are separate
 * and worded differently.
 *
 * Everything the API returns is already bucketed for charting, so nothing here
 * re-aggregates — the bars below plot `series` as it arrives.
 */

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

/* --info rather than --accent: --accent is plain black, so the two segments
   separated only by opacity and a colour the rest of the console uses for
   every control. A hue of its own is what makes the error share legible.
   Both tokens already carry a dark-theme value, so neither is restated here. */
/* Named for what the visitor got, not the status class. "Errors" is reserved
   for 5xx — the only bucket that means the app itself is at fault; 4xx is
   mostly bots probing /wp-admin and is not something to alarm the owner. */
const STATUS_BUCKETS = [
  { value: "2xx", label: "Served fine" },
  { value: "3xx", label: "Redirected" },
  { value: "4xx", label: "Not found" },
  { value: "5xx", label: "App errors" },
] as const;

const TRAFFIC_CONFIG = {
  ok: { label: "Requests", color: "var(--info)" },
  errors: { label: "Errors", color: "var(--danger)" },
} satisfies ChartConfig;

function formatCount(n: number): string {
  return n.toLocaleString();
}

/** Latency is null when nothing was served, which is not the same as 0 ms. */
function formatMs(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)} ms`;
}

/** The bucket label under a bar. Long ranges are dated; a day is clock time. */
function bucketLabel(iso: string, range: AnalyticsRange): string {
  const d = new Date(iso);
  return range === "24h"
    ? d.toLocaleTimeString([], { hour: "numeric" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

/**
 * Requests per bucket, errors stacked on top in the error colour.
 *
 * `ok` is derived rather than returned: the API gives requests and errors, and
 * stacking those two directly would double-count every failed request into the
 * column height.
 */
function TrafficChart({ series, range }: { series: Analytics["traffic"]["series"]; range: AnalyticsRange }) {
  const data = series.map((point) => ({
    bucketStart: point.bucketStart,
    ok: point.requests - point.errors,
    errors: point.errors,
  }));

  return (
    /* The grid row is as tall as the taller Top paths card beside it, so the
       plot area takes the slack instead of leaving it under the axis. */
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">Requests</div>
      <ChartContainer
        config={TRAFFIC_CONFIG}
        /* aspect-video is ChartContainer's default and would fix the height to
           the card's width; this chart instead fills whatever the row gives it. */
        className="mt-3 aspect-auto min-h-[16rem] w-full flex-1"
      >
        {/* A line rather than stacked bars: a quiet app is a flat run at zero
            with a spike where the traffic actually was, and that shape is what
            the reader is looking for. Bars gave every idle hour equal ink. */}
        <LineChart accessibilityLayer data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          {/* Horizontal only: the vertical rules would fight the dots. */}
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="bucketStart"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            /* 24h is 24 buckets and 90d is 90: let recharts drop the ticks that
               would collide rather than picking an interval per range. */
            interval="preserveStartEnd"
            minTickGap={24}
            tickFormatter={(iso: string) => bucketLabel(iso, range)}
          />
          {/* The scale is the point of a line chart — without it a spike has no
              size. Narrow enough not to steal width from the plot. */}
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(value: number) => formatCount(value)}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  bucketLabel(String(payload?.[0]?.payload?.bucketStart ?? ""), range)
                }
                formatter={(value, name) => [
                  `${formatCount(Number(value))} `,
                  TRAFFIC_CONFIG[name as keyof typeof TRAFFIC_CONFIG]?.label ?? name,
                ]}
              />
            }
          />
          {/* Dots only while the run is short enough for them to read as points
              rather than a thick line. */}
          <Line
            dataKey="ok"
            type="linear"
            stroke="var(--color-ok)"
            strokeWidth={2}
            dot={data.length <= 32 ? { r: 3, strokeWidth: 0, fill: "var(--color-ok)" } : false}
            activeDot={{ r: 4 }}
          />
          <Line
            dataKey="errors"
            type="linear"
            stroke="var(--color-errors)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function TopPaths({ paths }: { paths: Analytics["traffic"]["topPaths"] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">Top paths</div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {paths.map((row) => (
          <li key={row.path} className="flex items-baseline justify-between gap-4 text-[0.78rem]">
            <span className="min-w-0 truncate font-mono text-muted-foreground" title={row.path}>{row.path}</span>
            <span className="shrink-0 font-medium text-foreground">{formatCount(row.requests)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectAnalytics({
  companyId,
  projectId,
  isStatic = false,
}: {
  companyId: string | null;
  projectId: string;
  /** A static site runs no process: CPU and memory would only ever read
   *  "Not running", which looks like an outage. */
  isStatic?: boolean;
}) {
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [data, setData] = useState<Analytics | null>(null);
  /* Three outcomes, not two: loaded, pipeline down (503), or a real failure.
     `unavailable` is the middle one and reads as information, not an error. */
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setData(null);
    setUnavailable(false);
    setError(null);
    try {
      setData(await analyticsApi.project(companyId, projectId, range));
    } catch (e) {
      if (e instanceof HnsError && e.status === ANALYTICS_UNAVAILABLE) {
        setUnavailable(true);
        return;
      }
      setError(e instanceof Error ? e.message : "Couldn’t load analytics.");
    }
  }, [companyId, projectId, range]);

  useEffect(() => {
    load();
  }, [load]);

  const traffic = data?.traffic;
  const usage = data?.resourceUsage;

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.05rem] font-bold text-foreground">Traffic</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Time range">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
              className={
                range === option.value
                  ? "rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                  : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Down, not idle. Says so plainly rather than showing zeroes that the
          owner would read as "nobody visited my app". */}
      {unavailable && (
        <Alert variant="note">
          Analytics are temporarily unavailable for this app. This says nothing about whether it is
          being used — traffic is still being served.
        </Alert>
      )}

      {!data && !error && !unavailable && <Skeleton className="h-[200px]" aria-hidden="true" />}

      {traffic && usage && (
        <>
          <FactGrid>
            <Fact k="Requests" v={formatCount(traffic.totalRequests)} mono />
            <Fact
              k="Errors"
              v={formatCount(traffic.statusBreakdown["4xx"] + traffic.statusBreakdown["5xx"])}
              mono
            />
            <Fact k="Latency p50" v={formatMs(traffic.latencyMs.p50)} mono />
            <Fact k="Latency p95" v={formatMs(traffic.latencyMs.p95)} mono />
            {/* current is null when the app has never been sampled — it isn't
                running — so neither number is invented as a zero. */}
            {!isStatic && (
              <>
                <Fact
                  k="CPU now"
                  v={usage.current ? `${usage.current.cpuPercent.toFixed(1)}%` : "Not running"}
                  mono
                />
                <Fact
                  k="Memory now"
                  v={usage.current ? `${Math.round(usage.current.memoryMb)} MB` : "Not running"}
                  mono
                />
              </>
            )}
          </FactGrid>

          {traffic.totalRequests === 0 ? (
            <p className="rounded-xl border border-dashed border-input bg-card/50 px-4 py-6 text-center text-[0.92rem] text-muted-foreground">
              No requests in this range yet.
            </p>
          ) : (
            <div className="grid gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <TrafficChart series={traffic.series} range={range} />
              {traffic.topPaths.length > 0 && <TopPaths paths={traffic.topPaths} />}
            </div>
          )}

          {/* "2xx · 119" is a status class, which means nothing to the person
              whose AI built this app. Each one is named for what happened to
              the visitor instead, with the raw class kept as a title for the
              reader who does know what it means. */}
          <div className="grid gap-3 text-[0.8rem] sm:grid-cols-4">
            {STATUS_BUCKETS.map((bucket) => (
              <div key={bucket.value} title={`HTTP ${bucket.value}`}>
                <div className="text-faint">{bucket.label}</div>
                <div className="font-mono text-foreground">
                  {formatCount(traffic.statusBreakdown[bucket.value])}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
