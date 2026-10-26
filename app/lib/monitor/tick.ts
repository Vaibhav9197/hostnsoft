/**
 * One monitoring check. The scheduler (a viaSocket flow, every 5 minutes)
 * calls POST /api/monitor/tick, which runs this:
 *
 *   1. health checks on every configured target;
 *   2. reads the app list and compares it with the last one (diff.ts);
 *   3. copies new customer queries in;
 *   4. runs the alert rules and decides what to send (rules.ts, alerts.ts);
 *   5. queues the daily or weekly report when its time has come;
 *   6. hands every queued message back to the scheduler, which posts them.
 *
 * Each step records its own success, so a failed read becomes "no data" in
 * the reports instead of a silent zero, and one failing step never stops the
 * others.
 */

import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";
import { decide, type AlertState } from "./alerts";
import { diffApps, type AppRow, type UpstreamApp } from "./diff";
import { countEvents, historyDays, median, previousDays, summarize } from "./metrics";
import { dailyReport, weeklyReport } from "./report";
import { evaluate, type Readings } from "./rules";
import type { MonitorSettings } from "./settings";
import { enqueue, loadSettings } from "./store";
import { DAY, HOUR, inWindow, iso, localParts } from "./time";

export interface TickEnv {
  /** hostnsoft-api base, with /api. */
  apiBase: string;
  /** A super-admin's proxy_auth_token, until hostnsoft-api has a service route. */
  proxyToken: string | null;
  /** Where links in Slack messages point. */
  healthUrl: string;
}

export interface OutboxMessage {
  id: number;
  kind: string;
  channel: string | null;
  text: string;
}

export interface TickResult {
  at: string;
  apps: { ok: boolean; error: string | null; events: number };
  queries: { ok: boolean; error: string | null; added: number };
  health: { id: string; ok: boolean; status: number | null; ms: number; error: string | null }[];
  alerts: { firing: number; sent: number };
  reports: string[];
  messages: OutboxMessage[];
}

const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

async function getJson(url: string, token: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, {
    headers: { proxy_auth_token: token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    // Admin routes answer 404 to anyone who isn't a super-admin.
    throw new Error(`refused (${res.status}): the monitor's token is missing admin access or expired`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function checkHealth(s: MonitorSettings) {
  return Promise.all(
    s.health.targets.map(async (t) => {
      const start = Date.now();
      try {
        // Redirects are followed and only a 2xx counts: a health URL that now
        // redirects to a docs page must not keep reading as "up".
        const res = await fetch(t.url, { method: "GET", cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(s.health.timeoutMs) });
        const ok = res.ok;
        return { id: t.id, ok, status: res.status, ms: Date.now() - start, error: ok ? null : `HTTP ${res.status}` };
      } catch (e) {
        const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
        return { id: t.id, ok: false, status: null, ms: Date.now() - start, error: timedOut ? "no answer in time" : short(e) };
      }
    }),
  );
}

function changed(a: AppRow, b: AppRow | undefined): boolean {
  if (!b) return true;
  const keys: (keyof AppRow)[] = ["company", "is_temp", "was_temp", "created_at", "status", "deploy_count", "last_source", "last_agent", "claimed_at", "gone_at"];
  return keys.some((k) => a[k] !== b[k]);
}

const UPSERT_APP = `INSERT INTO monitor_apps (slug, company, is_temp, was_temp, created_at, status, deploy_count, last_source, last_agent, first_seen_at, last_seen_at, claimed_at, gone_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET company = excluded.company, is_temp = excluded.is_temp, was_temp = excluded.was_temp,
    created_at = excluded.created_at, status = excluded.status, deploy_count = excluded.deploy_count,
    last_source = excluded.last_source, last_agent = excluded.last_agent, first_seen_at = excluded.first_seen_at,
    last_seen_at = excluded.last_seen_at, claimed_at = excluded.claimed_at, gone_at = excluded.gone_at`;

/** Reads the app list and records what changed. Writes only rows that changed, to keep D1 writes low. */
async function collectApps(db: D1Database, env: TickEnv, s: MonitorSettings, nowMs: number) {
  const now = iso(nowMs);
  if (!env.proxyToken) throw new Error("MONITOR_PROXY_TOKEN is not set");
  const payload = await getJson(`${env.apiBase}/admin/apps`, env.proxyToken, 15_000);
  const list = (Array.isArray(payload) ? payload : (payload as { items?: unknown })?.items) as UpstreamApp[] | undefined;
  if (!Array.isArray(list)) throw new Error("unexpected app list shape");

  const { results: prev } = await db.prepare("SELECT * FROM monitor_apps").all<AppRow>();
  const diff = diffApps(prev, list, now, { tempTtlHours: s.tempApps.ttlHours });
  if (diff.refused) throw new Error(diff.refused);

  const prevBySlug = new Map(prev.map((r) => [r.slug, r]));
  const stmts: D1PreparedStatement[] = [];
  for (const r of diff.rows) {
    if (!changed(r, prevBySlug.get(r.slug))) continue;
    stmts.push(
      db.prepare(UPSERT_APP).bind(r.slug, r.company, r.is_temp, r.was_temp, r.created_at, r.status, r.deploy_count, r.last_source, r.last_agent, r.first_seen_at, r.last_seen_at, r.claimed_at, r.gone_at),
    );
  }
  for (const e of diff.events) {
    stmts.push(db.prepare("INSERT INTO monitor_events (at, kind, app_slug, is_temp, source, detail) VALUES (?, ?, ?, ?, ?, ?)").bind(e.at, e.kind, e.app_slug, e.is_temp, e.source, e.detail));
  }

  // Point-in-time counts, from the list as it is now.
  const alive = diff.rows.filter((r) => !r.gone_at);
  const overdueMs = (s.tempApps.ttlHours + s.tempApps.cleanupGraceHours) * HOUR;
  const overdue = alive.filter((r) => r.is_temp && r.created_at && nowMs - Date.parse(r.created_at) > overdueMs);
  const gauges: Record<string, number> = {
    total_apps: alive.length,
    live_apps: alive.filter((r) => r.status === "success").length,
    failing_apps: alive.filter((r) => r.status === "failed").length,
    temp_active: alive.filter((r) => r.is_temp).length,
    temp_overdue: overdue.length,
  };
  for (const [key, value] of Object.entries(gauges)) {
    stmts.push(db.prepare("INSERT OR REPLACE INTO monitor_gauges (at, key, value) VALUES (?, ?, ?)").bind(now, key, value));
  }
  // D1 caps a batch's size; chunk to stay well inside it.
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));

  return { events: diff.events.length, overdue: overdue.map((r) => r.slug) };
}

interface UpstreamQuery {
  id?: string | number;
  type?: string;
  message?: string;
  source?: string;
  email?: string;
  projectSlug?: string;
  agentName?: string;
  createdAt?: string;
}

/** Copies customer queries from the last 8 days in. Existing rows keep their triage. */
async function collectQueries(db: D1Database, env: TickEnv, s: MonitorSettings, nowMs: number) {
  if (!env.proxyToken) throw new Error("MONITOR_PROXY_TOKEN is not set");
  const first = await db.prepare("SELECT COUNT(*) AS n FROM monitor_queries").first<{ n: number }>();
  const isFirstImport = Number(first?.n ?? 0) === 0;
  const since = iso(nowMs - 8 * DAY);
  const rows: UpstreamQuery[] = [];
  for (let page = 1; page <= 5; page++) {
    const payload = (await getJson(
      `${env.apiBase}/admin/customer-query?createdFrom=${encodeURIComponent(since)}&limit=100&page=${page}`,
      env.proxyToken,
      10_000,
    )) as { items?: UpstreamQuery[]; totalPages?: number } | UpstreamQuery[];
    const items = Array.isArray(payload) ? payload : payload.items ?? [];
    rows.push(...items);
    if (Array.isArray(payload) || !payload.totalPages || page >= payload.totalPages) break;
  }

  /* The very first import would otherwise mark every query from the last 8
     days as open and overdue, including ones answered long ago. Older than the
     overdue time on day one → "before monitoring", not open. */
  const baselineBefore = nowMs - s.queries.overdueHours * HOUR;
  const stmts = rows
    .filter((q) => q.id != null && q.createdAt)
    .map((q) => {
      const status = isFirstImport && Date.parse(q.createdAt!) < baselineBefore ? "before_monitoring" : "open";
      return db
        .prepare(
          `INSERT OR IGNORE INTO monitor_queries (id, created_at, type, source, email, project_slug, agent_name, message, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(String(q.id), new Date(q.createdAt!).toISOString(), q.type ?? null, q.source ?? null, q.email ?? null, q.projectSlug ?? null, q.agentName ?? null, (q.message ?? "").slice(0, 2000), status);
    });
  let added = 0;
  for (let i = 0; i < stmts.length; i += 50) {
    const res = await db.batch(stmts.slice(i, i + 50));
    added += res.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
  }
  return { added };
}

/** Consecutive most-recent rows matching `bad`, newest first. */
function streak<T>(rows: T[], bad: (r: T) => boolean): number {
  let n = 0;
  for (const r of rows) {
    if (!bad(r)) break;
    n++;
  }
  return n;
}

async function gatherReadings(db: D1Database, s: MonitorSettings, nowMs: number, tempOverdue: string[], appsError: string | null): Promise<Readings> {
  const healthStreaks: Readings["healthStreaks"] = {};
  for (const t of s.health.targets) {
    const { results } = await db
      .prepare("SELECT ok, error FROM monitor_health WHERE target = ? ORDER BY at DESC LIMIT 20")
      .bind(t.id)
      .all<{ ok: number; error: string | null }>();
    healthStreaks[t.id] = { name: t.name, failures: streak(results, (r) => !r.ok), lastError: results[0]?.error ?? null };
  }

  const { results: runs } = await db.prepare("SELECT apps_ok FROM monitor_runs ORDER BY at DESC LIMIT 50").all<{ apps_ok: number }>();
  const hourAgo = iso(nowMs - HOUR);
  const dayAgo = iso(nowMs - DAY);
  const now = iso(nowMs);

  const trend = async (kind: string, extra = "") => {
    // The 7 days before the last 24 hours.
    const usual = median(await previousDays(db, kind, nowMs, 7, extra));
    return { last24: await countEvents(db, kind, dayAgo, now, extra), usual };
  };

  const overdueBefore = iso(nowMs - s.queries.overdueHours * HOUR);
  const overdue = await db.prepare("SELECT COUNT(*) AS n FROM monitor_queries WHERE status = 'open' AND created_at < ?").bind(overdueBefore).first<{ n: number }>();
  const { results: bugs } = await db
    .prepare("SELECT id, created_at, project_slug FROM monitor_queries WHERE status = 'open' AND type = 'platform_bug' ORDER BY created_at LIMIT 10")
    .all<{ id: string; created_at: string; project_slug: string | null }>();

  return {
    healthStreaks,
    appsReadFailures: streak(runs, (r) => !r.apps_ok),
    appsReadError: appsError,
    lastHour: {
      deploys: await countEvents(db, "deploy", hourAgo, now),
      failed: await countEvents(db, "deploy_failed", hourAgo, now),
    },
    tempOverdue,
    trends: {
      deploys: await trend("deploy"),
      temp_apps: await trend("app_created", "AND is_temp = 1"),
      new_workspaces: await trend("workspace_first_app"),
    },
    historyDays: await historyDays(db, nowMs),
    queriesOverdue: Number(overdue?.n ?? 0),
    bugReports: bugs.map((b) => ({ id: b.id, hours: (nowMs - Date.parse(b.created_at)) / HOUR, project: b.project_slug })),
  };
}

async function alreadySent(db: D1Database, kind: string, period: string) {
  return !!(await db.prepare("SELECT 1 AS x FROM monitor_sends WHERE kind = ? AND period = ?").bind(kind, period).first());
}

export async function runTick(db: D1Database, env: TickEnv, opts: { nowMs?: number; handOff: boolean }): Promise<TickResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const now = iso(nowMs);
  const { settings: s } = await loadSettings(db);

  // 1. Health.
  const health = await checkHealth(s);
  await db.batch(
    health.map((h) =>
      db.prepare("INSERT OR REPLACE INTO monitor_health (at, target, ok, status, ms, error) VALUES (?, ?, ?, ?, ?, ?)").bind(now, h.id, h.ok ? 1 : 0, h.status, h.ms, h.error),
    ),
  );

  // 2. Apps.
  let apps = { ok: false, error: null as string | null, events: 0 };
  let tempOverdue: string[] = [];
  try {
    const r = await collectApps(db, env, s, nowMs);
    apps = { ok: true, error: null, events: r.events };
    tempOverdue = r.overdue;
  } catch (e) {
    apps.error = short(e);
  }

  // 3. Queries.
  let queries = { ok: false, error: null as string | null, added: 0 };
  try {
    const r = await collectQueries(db, env, s, nowMs);
    queries = { ok: true, error: null, added: r.added };
  } catch (e) {
    queries.error = short(e);
  }
  const overdueBefore = iso(nowMs - s.queries.overdueHours * HOUR);
  const open = await db.prepare("SELECT COUNT(*) AS n FROM monitor_queries WHERE status = 'open'").first<{ n: number }>();
  const overdue = await db.prepare("SELECT COUNT(*) AS n FROM monitor_queries WHERE status = 'open' AND created_at < ?").bind(overdueBefore).first<{ n: number }>();

  await db.batch([
    db
      .prepare("INSERT OR REPLACE INTO monitor_runs (at, apps_ok, queries_ok, health_ok, error) VALUES (?, ?, ?, ?, ?)")
      .bind(now, apps.ok ? 1 : 0, queries.ok ? 1 : 0, health.every((h) => h.ok) ? 1 : 0, [apps.error, queries.error].filter(Boolean).join("; ") || null),
    db.prepare("INSERT OR REPLACE INTO monitor_gauges (at, key, value) VALUES (?, 'queries_open', ?)").bind(now, Number(open?.n ?? 0)),
    db.prepare("INSERT OR REPLACE INTO monitor_gauges (at, key, value) VALUES (?, 'queries_overdue', ?)").bind(now, Number(overdue?.n ?? 0)),
  ]);

  // 4. Alerts.
  const readings = await gatherReadings(db, s, nowMs, tempOverdue, apps.error);
  const firings = evaluate(readings, s);
  const keys = firings.map((f) => f.key);
  const { results: stored } = await db
    .prepare(`SELECT * FROM monitor_alerts WHERE state = 'open'${keys.length ? ` OR key IN (${keys.map(() => "?").join(",")})` : ""}`)
    .bind(...keys)
    .all<AlertState>();
  const local = localParts(nowMs, s.timezone);
  const quiet = s.quietHours.enabled && inWindow(local.hm, s.quietHours.start, s.quietHours.end);
  const decision = decide(firings, stored, nowMs, s, quiet, env.healthUrl);
  if (decision.upserts.length) {
    await db.batch(
      decision.upserts.map((a) =>
        db
          .prepare(
            `INSERT OR REPLACE INTO monitor_alerts (key, rule, level, state, title, detail, first_at, last_at, sent_at, sent_level, resolved_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(a.key, a.rule, a.level, a.state, a.title, a.detail, a.first_at, a.last_at, a.sent_at, a.sent_level, a.resolved_at),
      ),
    );
  }
  for (const m of decision.messages) await enqueue(db, `alert_${m.level}`, m.channel, m.text);

  // 5. Reports.
  const reports: string[] = [];
  const openAlerts = decision.upserts.filter((a) => a.state === "open");
  // Include this check's own rows, which are stamped `now`.
  const end = nowMs + 1000;
  /* On the very first check there is nothing to report yet: today's slot is
     marked done instead, so a fresh install never opens with an empty report. */
  const firstRun = !(await db.prepare("SELECT 1 AS x FROM monitor_runs WHERE at < ? LIMIT 1").bind(now).first());
  const markSent = (kind: string) =>
    db.prepare("INSERT OR IGNORE INTO monitor_sends (kind, period, at) VALUES (?, ?, ?)").bind(kind, local.date, now).run();

  if (s.reports.daily.enabled && local.hm >= s.reports.daily.time && !(await alreadySent(db, "daily", local.date))) {
    if (!firstRun) {
      const summary = await summarize(db, end - DAY, end, s);
      const notes = firings.filter((f) => f.level === "info" || f.rule.endsWith("_change"));
      await enqueue(db, "daily", s.channels.reports, dailyReport({ summary, open: openAlerts, notes, nowMs, timezone: s.timezone, healthUrl: env.healthUrl }));
      reports.push("daily");
    }
    await markSent("daily");
  }
  if (s.reports.weekly.enabled && local.weekday === s.reports.weekly.day && local.hm >= s.reports.weekly.time && !(await alreadySent(db, "weekly", local.date))) {
    if (!firstRun) {
      const cur = await summarize(db, end - 7 * DAY, end, s);
      const prev = await summarize(db, end - 14 * DAY, end - 7 * DAY, s);
      await enqueue(db, "weekly", s.channels.reports, weeklyReport({ cur, prev, open: openAlerts, fromMs: end - 7 * DAY, toMs: end, timezone: s.timezone, healthUrl: env.healthUrl }));
      reports.push("weekly");
    }
    await markSent("weekly");
  }

  // Housekeeping, once an hour: the fine-grained rows don't need to live forever.
  if (local.hm.slice(3) < "05") {
    await db.batch([
      db.prepare("DELETE FROM monitor_health WHERE at < ?").bind(iso(nowMs - 120 * DAY)),
      db.prepare("DELETE FROM monitor_gauges WHERE at < ? AND strftime('%H:%M', at) NOT BETWEEN '00:00' AND '00:04'").bind(iso(nowMs - 30 * DAY)),
      db.prepare("DELETE FROM monitor_outbox WHERE handed_at IS NOT NULL AND handed_at < ?").bind(iso(nowMs - 30 * DAY)),
    ]);
  }

  // 6. Hand queued messages to the scheduler.
  let messages: OutboxMessage[] = [];
  if (opts.handOff) {
    const { results } = await db
      .prepare("SELECT id, kind, channel, text FROM monitor_outbox WHERE handed_at IS NULL ORDER BY id LIMIT 20")
      .all<OutboxMessage>();
    if (results.length) {
      await db
        .prepare(`UPDATE monitor_outbox SET handed_at = ? WHERE id IN (${results.map(() => "?").join(",")})`)
        .bind(now, ...results.map((m) => m.id))
        .run();
    }
    messages = results;
  }

  return {
    at: now,
    apps,
    queries,
    health,
    alerts: { firing: firings.length, sent: decision.messages.length },
    reports,
    messages,
  };
}
