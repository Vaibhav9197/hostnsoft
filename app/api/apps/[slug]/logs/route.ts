import type { NextRequest } from "next/server";
import { DEPLOY_BASE, proxy } from "../../../../lib/api";

// GET /api/apps/:slug/logs — tail of the app's most recent allocation.
//
// This can't go through the generic /api/hns proxy: that one prefixes the
// management API base (…/api), while the deploy routes live at the origin
// root. Calling it via /api/hns lands on …/api/apps/:slug/logs, which 404s.

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const stream = req.nextUrl.searchParams.get("stream") === "stderr" ? "stderr" : "stdout";

  return proxy(`/apps/${encodeURIComponent(slug)}/logs`, {
    method: "GET",
    search: `?stream=${stream}`,
    base: DEPLOY_BASE,
  });
}
