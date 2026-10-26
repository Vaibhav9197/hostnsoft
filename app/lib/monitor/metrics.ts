/**
 * Every monitoring number, defined once.
 *
 * The admin Health page, the daily and weekly Slack reports and the alert rules
 * all call summarize() or the helpers below, so "deploys" or "temporary apps
 * kept" can never mean one thing on the page and another in Slack.
 *
 * Definitions (also in docs/MONITORING.md):
 * - Deploy: a deploy by a signed-in workspace, as recorded by hostnsoft-api.
 *   Temporary apps are counted separately; upstream records no deploys for them.
 * - Failed deploy: a deploy whose latest outcome is "failed".
 * - New app: a workspace app first seen in the period. Temporary apps are not in it.
 * - Temporary app created / kept / expired: first seen, claimed into a
 *   workspace, or gone from the list, in the period.
 * - Kept rate: of temporary apps created in the period, the share claimed so far.
 * - New workspace: a workspace whose first app appeared (or was claimed) in the period.
 * - Live apps: apps whose latest deploy succeeded, at the end of the period.
 * - Customer query open / overdue: not marked resolved; overdue once older
 *   than the overdue setting.
 * - Uptime: share of health checks that passed.
 * - Signups: not tracked yet. hostnsoft-api has no signup record to read.
 *
 * A period with no successful check is "no data", never zero.
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { MonitorSettings } from "./settings";
import { DAY, iso } from "./time";

/** How often the scheduler calls the monitor. Coverage is measured against it. */
export const CHECK_EVERY_MS = 5 * 60_000;

export type DataState = "ok" | "partial" | "none";

export interface Summary {
  from: string;
  to: string;
  data: { state: DataState; coverage: number; appsChecks: number; expectedChecks: number };
  apps: {
    created: number;
    deleted: number;
    deploys: number;
    failed: number;
    /** 0–100, null with no deploys. */
    failureRate: number | null;
    bySource: { source: string; deploys: number; failed: number }[];
  };
  temp: {
    created: number;
    claimed: number;
    expired: number;
    expiredEarly: number;
    /** Of temporary apps created in the period, % claimed so far. */
    keptRate: number | null;
    activeNow: number | null;
    overdueNow: number | null;
  };
  workspaces: { firstApp: number };
  live: { live: number | null; failing: number | null; total: number | null };
  queries: {
    created: number;
    byType: { type: string; count: number }[];
    resolved: number;
    openNow: number;
    overdueNow: number;
    /** Median hours from received to resolved, for queries resolved in the period. */
    medianHoursToResolve: number | null;
  };
  health: { id: string; name: string; checks: number; passed: number; uptime: number | null }[];
  web: { visitors: number; promptCopies: number } | null;
  signups: null;
}

const BOT = ["%bot%", "%crawler%", "%spider%", "%curl%", "%wget%", "%headless%", "%lighthouse%", "%preview%"];
const NOT_A_BOT = BOT.map(() => "LOWER(COALESCE(user_agent, '')) NOT LIKE ?").join(" AND ");

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

async function count(db: D1Database, sql: string, ...binds: unknown[]): Promise<number> {
  const row = await db.prepare(sql).bind(...binds).first<{ n: number }>();
  return Number(row?.n ?? 0);
}

/** Latest point-in-time value at or before `to`, or null if never recorded. */
export async function gaugeAt(db: D1Database, key: string, to: string): Promise<number | null> {
  const row = await db
    .prepare("SELECT value FROM monitor_gauges WHERE key = ? AND at <= ? ORDER BY at DESC LIMIT 1")
    .bind(key, to)
    .first<{ value: number }>();
  return row ? Number(row.value) : null;
}

/** Events of one kind in [from, to). */
export function countEvents(db: D1Database, kind: string, from: string, to: string, extra = "", ...binds: unknown[]) {
  return count(db, `SELECT COUNT(*) AS n FROM monitor_events WHERE kind = ? AND at >= ? AND at < ? ${extra}`, kind, from, to, ...binds);
}

export async function summarize(db: D1Database, fromMs: number, toMs: number, settings: MonitorSettings): Promise<Summary> {
  const from = iso(fromMs);
  const to = iso(toMs);

  const expectedChecks = Math.max(1, Math.round((toMs - fromMs) / CHECK_EVERY_MS));
  const appsChecks = await count(db, "SELECT COUNT(*) AS n FROM monitor_runs WHERE apps_ok = 1 AND at >= ? AND at < ?", from, to);
  const coverage = Math.min(1, appsChecks / expectedChecks);
  const state: DataState = appsChecks === 0 ? "none" : coverage < 0.8 ? "partial" : "ok";

  const [created, deleted, deploys, failed, tempCreated, claimed, expired, expiredEarly, firstApp] = await Promise.all([
    countEvents(db, "app_created", from, to, "AND is_temp = 0"),
    countEvents(db, "app_deleted", from, to),
    countEvents(db, "deploy", from, to),
    countEvents(db, "deploy_failed", from, to),
    countEvents(db, "app_created", from, to, "AND is_temp = 1"),
    countEvents(db, "temp_claimed", from, to),
    countEvents(db, "temp_expired", from, to),
    countEvents(db, "temp_expired", from, to, "AND detail = 'early'"),
    countEvents(db, "workspace_first_app", from, to),
  ]);

  const { results: sourceRows } = await db
    .prepare(
      `SELECT COALESCE(source, 'unknown') AS source,
              SUM(kind = 'deploy') AS deploys, SUM(kind = 'deploy_failed') AS failed
       FROM monitor_events WHERE kind IN ('deploy', 'deploy_failed') AND at >= ? AND at < ?
       GROUP BY 1 ORDER BY deploys DESC LIMIT 8`,
    )
    .bind(from, to)
    .all<{ source: string; deploys: number; failed: number }>();

  const tempCohort = await db
    .prepare(
      `SELECT COUNT(*) AS n, SUM(claimed_at IS NOT NULL) AS kept FROM monitor_apps
       WHERE was_temp = 1 AND created_at >= ? AND created_at < ?`,
    )
    .bind(from, to)
    .first<{ n: number; kept: number }>();

  // Queries.
  const overdueBefore = iso(toMs - settings.queries.overdueHours * 3600_000);
  const [qCreated, qResolved, qOpen, qOverdue] = await Promise.all([
    count(db, "SELECT COUNT(*) AS n FROM monitor_queries WHERE created_at >= ? AND created_at < ?", from, to),
    count(db, "SELECT COUNT(*) AS n FROM monitor_queries WHERE status != 'open' AND resolved_at >= ? AND resolved_at < ?", from, to),
    count(db, "SELECT COUNT(*) AS n FROM monitor_queries WHERE status = 'open' AND created_at < ?", to),
    count(db, "SELECT COUNT(*) AS n FROM monitor_queries WHERE status = 'open' AND created_at < ?", overdueBefore),
  ]);
  const { results: typeRows } = await db
    .prepare(
      `SELECT COALESCE(type, 'other') AS type, COUNT(*) AS count FROM monitor_queries
       WHERE created_at >= ? AND created_at < ? GROUP BY 1 ORDER BY count DESC`,
    )
    .bind(from, to)
    .all<{ type: string; count: number }>();
  const { results: resolveRows } = await db
    .prepare(
      `SELECT (julianday(resolved_at) - julianday(created_at)) * 24 AS hours FROM monitor_queries
       WHERE status = 'resolved' AND resolved_at >= ? AND resolved_at < ? ORDER BY hours`,
    )
    .bind(from, to)
    .all<{ hours: number }>();
  const median = resolveRows.length ? Math.round(resolveRows[Math.floor(resolveRows.length / 2)].hours * 10) / 10 : null;

  // Health, per configured target.
  const { results: healthRows } = await db
    .prepare("SELECT target, COUNT(*) AS checks, SUM(ok) AS passed FROM monitor_health WHERE at >= ? AND at < ? GROUP BY target")
    .bind(from, to)
    .all<{ target: string; checks: number; passed: number }>();
  const byTarget = new Map(healthRows.map((r) => [r.target, r]));
  const health = settings.health.targets.map((t) => {
    const r = byTarget.get(t.id);
    const checks = Number(r?.checks ?? 0);
    const passed = Number(r?.passed ?? 0);
    return { id: t.id, name: t.name, checks, passed, uptime: pct(passed, checks) };
  });

  // Website traffic from the A/B events, bots filtered the same way /api/metrics does.
  let web: Summary["web"] = null;
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(DISTINCT CASE WHEN event = 'page_view' THEN visitor_id END) AS visitors,
                COUNT(DISTINCT CASE WHEN event = 'cta_clicked' AND json_extract(data, '$.cta_type') = 'copy' THEN visitor_id END) AS copies
         FROM hero_events WHERE ${NOT_A_BOT} AND created_at >= ? AND created_at < ?`,
      )
      // hero_events.created_at is SQLite's "YYYY-MM-DD HH:MM:SS" (UTC).
      .bind(...BOT, from.replace("T", " ").slice(0, 19), to.replace("T", " ").slice(0, 19))
      .first<{ visitors: number; copies: number }>();
    web = { visitors: Number(row?.visitors ?? 0), promptCopies: Number(row?.copies ?? 0) };
  } catch {
    web = null;
  }

  const [live, failing, total, activeNow, overdueNow] = await Promise.all([
    gaugeAt(db, "live_apps", to),
    gaugeAt(db, "failing_apps", to),
    gaugeAt(db, "total_apps", to),
    gaugeAt(db, "temp_active", to),
    gaugeAt(db, "temp_overdue", to),
  ]);

  return {
    from,
    to,
    data: { state, coverage: Math.round(coverage * 100), appsChecks, expectedChecks },
    apps: {
      created,
      deleted,
      deploys,
      failed,
      failureRate: pct(failed, deploys),
      bySource: sourceRows.map((r) => ({ source: r.source, deploys: Number(r.deploys ?? 0), failed: Number(r.failed ?? 0) })),
    },
    temp: {
      created: tempCreated,
      claimed,
      expired,
      expiredEarly,
      keptRate: pct(Number(tempCohort?.kept ?? 0), Number(tempCohort?.n ?? 0)),
      activeNow,
      overdueNow,
    },
    workspaces: { firstApp },
    live: { live, failing, total },
    queries: {
      created: qCreated,
      byType: typeRows.map((r) => ({ type: r.type, count: Number(r.count) })),
      resolved: qResolved,
      openNow: qOpen,
      overdueNow: qOverdue,
      medianHoursToResolve: median,
    },
    health,
    web,
    signups: null,
  };
}

/**
 * Counts of one event kind in each of the `days` 24-hour windows before
 * `toMs - DAY`, oldest first, skipping windows with no successful check
 * (those are missing data, not quiet days). Feeds the trend rules' "usual".
 */
export async function previousDays(
  db: D1Database,
  kind: string,
  toMs: number,
  days: number,
  extra = "",
): Promise<number[]> {
  const out: number[] = [];
  for (let i = days; i >= 1; i--) {
    const end = toMs - i * DAY;
    const start = end - DAY;
    const checks = await count(db, "SELECT COUNT(*) AS n FROM monitor_runs WHERE apps_ok = 1 AND at >= ? AND at < ?", iso(start), iso(end));
    if (checks === 0) continue;
    out.push(await countEvents(db, kind, iso(start), iso(end), extra));
  }
  return out;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Days since the monitor's first successful check. */
export async function historyDays(db: D1Database, nowMs: number): Promise<number> {
  const row = await db.prepare("SELECT MIN(at) AS first FROM monitor_runs WHERE apps_ok = 1").first<{ first: string | null }>();
  if (!row?.first) return 0;
  return Math.floor((nowMs - Date.parse(row.first)) / DAY);
}
