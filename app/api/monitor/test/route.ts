import { NextResponse } from "next/server";
import { currentSuperAdmin } from "../../../lib/api";
import { monitorDb, monitorError } from "../../../lib/monitor/server";
import { enqueue, loadSettings } from "../../../lib/monitor/store";

export const dynamic = "force-dynamic";

/**
 * Queues one test message per configured channel. The scheduler posts them on
 * its next check, so this proves the whole path: Worker → flow → Slack.
 */
export async function POST() {
  const admin = await currentSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const db = monitorDb();
    const { settings } = await loadSettings(db);
    const fallback = settings.channels.reports || settings.channels.critical || settings.channels.warning;
    if (!fallback) {
      return NextResponse.json({ error: "Set a Slack channel under “Where to send” and save first." }, { status: 400 });
    }
    // The same fallback the hand-off uses, so the test lands where real alerts will.
    const channels = [...new Set([settings.channels.critical, settings.channels.warning, settings.channels.reports].map((c) => c || fallback))];
    for (const channel of channels) {
      await enqueue(db, "test", channel, `🧪 Test from Embarko monitoring, sent by ${admin.email || admin.id}. If you can read this, alerts reach ${channel}.`);
    }
    return NextResponse.json({ ok: true, queued: channels.length });
  } catch (err) {
    return monitorError(err);
  }
}
