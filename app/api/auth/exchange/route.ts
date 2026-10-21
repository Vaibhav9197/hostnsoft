import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { exchange } from "../../../lib/api";
import { getDb } from "../../../lib/db";
import { isVariant } from "../../../lib/variants";

export const runtime = "nodejs";

// POST /api/auth/exchange — verify an MSG91 proxy_auth_token and store it as
// the session cookie. Returns { user, companies, currentCompany, apiConnected }.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing MSG91 token" }, { status: 400 });
  }
  const res = await exchange(token);
  if (res.ok) await recordSignIn(req);
  return res;
}

/**
 * Files a successful sign-in under the landing-page arm the visitor was
 * bucketed into, for the A/B dashboard.
 *
 * Recorded here, server-side, rather than from the browser: this is the one
 * point where a sign-in is known to have worked. It counts sign-ins, not new
 * accounts — the API has no "new user" flag — but the split is random, so
 * returning users land evenly across arms and the comparison stays fair.
 *
 * Never blocks the sign-in. A visitor with no arm cookie, or a failed write,
 * just isn't counted.
 */
async function recordSignIn(req: NextRequest) {
  const variant = req.cookies.get("lp_variant")?.value;
  const visitorId = req.cookies.get("visitor_id")?.value;
  if (!isVariant(variant) || !visitorId) return;
  try {
    await getDb()
      .prepare(`INSERT INTO hero_events (visitor_id, variant, event, url, user_agent) VALUES (?, ?, 'signin', ?, ?)`)
      .bind(visitorId, variant, "/api/auth/exchange", req.headers.get("user-agent") ?? "")
      .run();
  } catch (err) {
    console.error("Sign-in tracking error:", err);
  }
}
