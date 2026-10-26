import { NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "../../../lib/api";
import type { AlertState } from "../../../lib/monitor/alerts";
import { summarize } from "../../../lib/monitor/metrics";
import { dailyReport, weeklyReport } from "../../../lib/monitor/report";
import { monitorDb, monitorError, tickEnv } from "../../../lib/monitor/server";
import { loadSettings } from "../../../lib/monitor/store";
import { DAY } from "../../../lib/monitor/time";

export const dynamic = "force-dynamic";

/**
 * The daily or weekly report as it would read right now, without queuing it.
 * Uses the saved settings, so save first to preview a change.
 */
export async function POST(req: NextRequest) {
  if (!(await currentSuperAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const kind = body?.kind === "weekly" ? "weekly" : "daily";

  try {
    const db = monitorDb();
    const { settings } = await loadSettings(db);
    const nowMs = Date.now();
    const { results: open } = await db.prepare("SELECT * FROM monitor_alerts WHERE state = 'open'").all<AlertState>();
    const healthUrl = tickEnv().healthUrl;

    const text =
      kind === "daily"
        ? dailyReport({ summary: await summarize(db, nowMs - DAY, nowMs, settings), open, notes: [], nowMs, timezone: settings.timezone, healthUrl })
        : weeklyReport({
            cur: await summarize(db, nowMs - 7 * DAY, nowMs, settings),
            prev: await summarize(db, nowMs - 14 * DAY, nowMs - 7 * DAY, settings),
            open,
            fromMs: nowMs - 7 * DAY,
            toMs: nowMs,
            timezone: settings.timezone,
            healthUrl,
          });
    return NextResponse.json({ kind, text });
  } catch (err) {
    return monitorError(err);
  }
}
