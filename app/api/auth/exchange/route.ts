import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { exchange } from "../../../lib/api";

export const runtime = "nodejs";

// POST /api/auth/exchange — turn an MSG91 proxy_auth_token into a hostnsoft
// session. Sets the httpOnly session cookies and returns { user, companies }.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing MSG91 token" }, { status: 400 });
  }
  return exchange(token);
}
