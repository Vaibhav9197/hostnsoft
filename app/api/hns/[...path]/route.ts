import type { NextRequest } from "next/server";
import { API_BASE } from "../../../lib/api";
import { forwardRequest } from "../../../lib/hnsForward";

// Generic authenticated proxy to hostnsoft-api.
// Everything under /api/hns/<path> is forwarded to <API_BASE>/<path> with the
// caller's proxy_auth_token attached from the session cookie.
//
// e.g. GET  /api/hns/companies
//      POST /api/hns/companies/:id/projects
//      PUT  /api/hns/companies/:id/projects/:pid/env-vars
//
// In production this route is normally not reached: worker.ts answers
// /api/hns/* with the same forwardRequest before the Next server loads. It is
// what `next dev` serves, and the fallback if worker.ts ever lets one through.

export const runtime = "nodejs";

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forwardRequest(req, API_BASE, path);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
