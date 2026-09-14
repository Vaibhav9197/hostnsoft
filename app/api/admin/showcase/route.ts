import { NextRequest, NextResponse } from "next/server";

import { currentSuperAdmin } from "../../../lib/api";
import { getDb } from "../../../lib/db";

/**
 * Showcase review: list every submission, and change one's state.
 *
 * Guarded here as well as on the page. The page check keeps the markup away
 * from strangers; this is the one that protects the data, because an endpoint
 * can be requested directly.
 */

const STATUSES = ["pending", "approved", "rejected"] as const;
const PRO_STATUSES = ["requested", "granted", "declined"] as const;

export async function GET() {
  if (!(await currentSuperAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  /* Pending first, then newest: this page exists to work through a queue, so
     the thing needing a decision sorts to the top. */
  const { results } = await getDb()
    .prepare(
      `SELECT id, slug, name, tagline, app_url, screenshot_url, video_url,
              creator_name, creator_profile, built_with, category,
              hackathon_code, status, featured, pro_status, created_at
         FROM showcase_apps
        ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 200`,
    )
    .all();

  return NextResponse.json({ submissions: results ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await currentSuperAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Which submission?" }, { status: 400 });

  /* Each field is applied only when present, so the reviewer can approve
     without also restating featured and the Pro decision. */
  const sets: string[] = [];
  const binds: (string | number)[] = [];

  if (typeof body?.status === "string") {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    sets.push("status = ?");
    binds.push(body.status);
  }

  if (typeof body?.featured === "boolean") {
    sets.push("featured = ?");
    binds.push(body.featured ? 1 : 0);
  }

  if (typeof body?.proStatus === "string") {
    if (!PRO_STATUSES.includes(body.proStatus as (typeof PRO_STATUSES)[number])) {
      return NextResponse.json({ error: "Unknown Pro status" }, { status: 400 });
    }
    sets.push("pro_status = ?");
    binds.push(body.proStatus);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  binds.push(id);

  await getDb()
    .prepare(`UPDATE showcase_apps SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  return NextResponse.json({ ok: true });
}
