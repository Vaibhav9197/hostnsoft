import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { API_BASE } from "../../../lib/api";

export const runtime = "nodejs";

// GET /api/auth/connector-callback — same-origin bridge for the AI-connector
// login page (app/connector/login). The browser never calls hostnsoft-api
// directly (see lib/api.ts's own note on why), so this just forwards the
// widget's proxy_auth_token + the caller's redirect_uri/state on to
// hostnsoft-api's GET /auth/msg91/callback, which does the actual allowlist
// check and appends `code` (+ `state`) to the caller's redirect_uri. This
// route does no validation itself - hostnsoft-api owns that.
export async function GET(req: NextRequest) {
  const target = new URL(`${API_BASE}/auth/msg91/callback`);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target.toString());
}
