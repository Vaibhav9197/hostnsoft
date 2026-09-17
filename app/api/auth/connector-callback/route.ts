import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { API_BASE } from "../../../lib/api";

export const runtime = "nodejs";

// GET /api/auth/connector-callback — same-origin bridge for the AI-connector
// login page (app/connector/login). The browser never calls hostnsoft-api
// directly (see lib/api.ts's own note on why), so this calls hostnsoft-api's
// GET /auth/msg91/callback server-side — with proxy_auth_token in the header,
// like every other upstream call (see lib/api.ts's `upstream()`), since
// hostnsoft-api only reads it from there, never from a query param — and
// redirects the browser to whatever Location it returns (the caller's
// redirect_uri with `code` (+ `state`) appended). This route does no
// validation itself - hostnsoft-api owns that.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const proxyToken = params.get("proxy_auth_token");

  const target = new URL(`${API_BASE}/auth/msg91/callback`);
  params.forEach((value, key) => {
    if (key !== "proxy_auth_token") target.searchParams.set(key, value);
  });

  const res = await fetch(target.toString(), {
    headers: proxyToken ? { proxy_auth_token: proxyToken } : {},
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });

  const location = res.headers.get("location");
  if (!location) {
    const body = await res.text().catch(() => "");
    return new NextResponse(body || "Sign-in callback failed.", {
      status: res.status >= 300 && res.status < 400 ? 502 : res.status,
    });
  }

  return NextResponse.redirect(location);
}
