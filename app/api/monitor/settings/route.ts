import { NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "../../../lib/api";
import { monitorDb, monitorError } from "../../../lib/monitor/server";
import { DEFAULTS, RULES, parseSubmitted } from "../../../lib/monitor/settings";
import { loadSettings, saveSettings, settingsHistory } from "../../../lib/monitor/store";

export const dynamic = "force-dynamic";

/** Monitoring settings for /admin/monitoring, plus what the page needs to show setup state. */
export async function GET() {
  if (!(await currentSuperAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const db = monitorDb();
    const { settings, updatedAt, updatedBy } = await loadSettings(db);
    const lastRun = await db
      .prepare("SELECT at, apps_ok, queries_ok, error FROM monitor_runs ORDER BY at DESC LIMIT 1")
      .first<{ at: string; apps_ok: number; queries_ok: number; error: string | null }>();
    const lastHandOff = await db.prepare("SELECT MAX(handed_at) AS at FROM monitor_outbox").first<{ at: string | null }>();
    const pending = await db.prepare("SELECT COUNT(*) AS n FROM monitor_outbox WHERE handed_at IS NULL").first<{ n: number }>();

    return NextResponse.json({
      settings,
      defaults: DEFAULTS,
      rules: RULES,
      updatedAt,
      updatedBy,
      history: await settingsHistory(db),
      setup: {
        // Whether each secret is set — never its value.
        secretSet: !!process.env.MONITOR_SECRET,
        tokenSet: !!process.env.MONITOR_PROXY_TOKEN,
        lastRun: lastRun ? { at: lastRun.at, appsOk: !!lastRun.apps_ok, queriesOk: !!lastRun.queries_ok, error: lastRun.error } : null,
        lastHandOff: lastHandOff?.at ?? null,
        pending: Number(pending?.n ?? 0),
      },
    });
  } catch (err) {
    return monitorError(err);
  }
}

export async function PUT(req: NextRequest) {
  const admin = await currentSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { settings, errors } = parseSubmitted(body?.settings);
  if (Object.keys(errors).length) return NextResponse.json({ error: "Some values need fixing.", errors }, { status: 400 });

  try {
    const changed = await saveSettings(monitorDb(), settings, admin.email || admin.id);
    return NextResponse.json({ ok: true, changed });
  } catch (err) {
    return monitorError(err);
  }
}
