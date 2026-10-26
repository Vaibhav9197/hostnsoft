import { NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "../../../lib/api";
import type { AlertState } from "../../../lib/monitor/alerts";
import { summarize } from "../../../lib/monitor/metrics";
import { monitorDb, monitorError } from "../../../lib/monitor/server";
import { loadSettings } from "../../../lib/monitor/store";
import { DAY, HOUR } from "../../../lib/monitor/time";

export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY };

/**
 * Everything /admin/health shows: the period's numbers next to the period
 * before, what is open now, temporary apps online, and queries to answer.
 * The numbers come from summarize(), the same function the Slack reports use.
 */
export async function GET(req: NextRequest) {
  if (!(await currentSuperAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const range = req.nextUrl.searchParams.get("range") ?? "24h";
  const span = RANGES[range];
  if (!span) return NextResponse.json({ error: "Unknown range" }, { status: 400 });

  try {
    const db = monitorDb();
    const { settings } = await loadSettings(db);
    const nowMs = Date.now();

    const [cur, prev] = await Promise.all([summarize(db, nowMs - span, nowMs, settings), summarize(db, nowMs - 2 * span, nowMs - span, settings)]);

    const { results: alerts } = await db
      .prepare("SELECT * FROM monitor_alerts WHERE state = 'open' ORDER BY CASE level WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, first_at")
      .all<AlertState>();

    const ttl = settings.tempApps.ttlHours * HOUR;
    const { results: temp } = await db
      .prepare("SELECT slug, created_at FROM monitor_apps WHERE is_temp = 1 AND gone_at IS NULL ORDER BY created_at")
      .all<{ slug: string; created_at: string | null }>();

    const { results: queries } = await db
      .prepare(
        `SELECT id, created_at, type, source, email, project_slug, agent_name, message FROM monitor_queries
         WHERE status = 'open' ORDER BY created_at LIMIT 50`,
      )
      .all<Record<string, string | null>>();

    const { results: events } = await db
      .prepare("SELECT at, kind, app_slug, is_temp, source, detail FROM monitor_events ORDER BY id DESC LIMIT 30")
      .all();

    const lastRun = await db
      .prepare("SELECT at, apps_ok, queries_ok, error FROM monitor_runs ORDER BY at DESC LIMIT 1")
      .first<{ at: string; apps_ok: number; queries_ok: number; error: string | null }>();

    return NextResponse.json({
      range,
      cur,
      prev,
      alerts,
      tempApps: temp.map((t) => ({
        slug: t.slug,
        createdAt: t.created_at,
        expiresAt: t.created_at ? new Date(Date.parse(t.created_at) + ttl).toISOString() : null,
      })),
      queries,
      events,
      overdueHours: settings.queries.overdueHours,
      lastRun: lastRun ? { at: lastRun.at, appsOk: !!lastRun.apps_ok, queriesOk: !!lastRun.queries_ok, error: lastRun.error } : null,
    });
  } catch (err) {
    return monitorError(err);
  }
}
