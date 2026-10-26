import { NextRequest, NextResponse } from "next/server";
import { currentSuperAdmin } from "../../../../lib/api";
import { monitorDb, monitorError } from "../../../../lib/monitor/server";
import { QUERY_STATUSES, setQueryStatus, type QueryStatus } from "../../../../lib/monitor/store";

export const dynamic = "force-dynamic";

/**
 * Marks a customer query open, resolved or won't fix. hostnsoft-api has no
 * status for queries yet, so this triage lives in D1 next to the copy.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status as QueryStatus;
  if (!QUERY_STATUSES.includes(status)) return NextResponse.json({ error: "Status must be open, resolved or wont_fix." }, { status: 400 });

  try {
    const ok = await setQueryStatus(monitorDb(), id, status, admin.email || admin.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Query not found" }, { status: 404 });
  } catch (err) {
    return monitorError(err);
  }
}
