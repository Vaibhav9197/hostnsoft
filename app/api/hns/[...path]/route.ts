import type { NextRequest } from "next/server";
import { proxy } from "../../../lib/api";

// Generic authenticated proxy to hostnsoft-api.
// Everything under /api/hns/<path> is forwarded to <API_BASE>/<path> with the
// caller's proxy_auth_token attached from the session cookie.
//
// e.g. GET  /api/hns/companies
//      POST /api/hns/companies/:id/projects
//      PUT  /api/hns/companies/:id/projects/:pid/env-vars

export const runtime = "nodejs";

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = "/" + path.map(encodeURIComponent).join("/");
  const search = req.nextUrl.search;

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "DELETE";
  const body = hasBody ? await req.text() : null;

  return proxy(target, { method, body: body || null, search });
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
