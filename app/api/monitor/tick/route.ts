import { NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "../../../lib/api";
import { monitorDb, monitorError, secretMatches, tickEnv } from "../../../lib/monitor/server";
import { runTick } from "../../../lib/monitor/tick";

export const dynamic = "force-dynamic";

/**
 * One monitoring check (app/lib/monitor/tick.ts).
 *
 * Two callers:
 * - The scheduler, a viaSocket flow every 5 minutes, with the X-Monitor-Secret
 *   header. It gets back `messages` and posts each to Slack; once handed over,
 *   a message is not handed over again.
 * - A platform admin pressing "Run checks now". The check runs and records
 *   everything, but queued messages stay queued for the scheduler, so Slack
 *   never gets a message twice and the admin never posts by accident.
 */
export async function POST(req: NextRequest) {
  const fromScheduler = secretMatches(req.headers.get("x-monitor-secret"));
  if (!fromScheduler && !(await currentSuperAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const result = await runTick(monitorDb(), tickEnv(), { handOff: fromScheduler });
    return NextResponse.json(result);
  } catch (err) {
    return monitorError(err);
  }
}
