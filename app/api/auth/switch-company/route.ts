import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { switchCompany } from "../../../lib/api";

export const runtime = "nodejs";

// POST /api/auth/switch-company — switch the active company for the current
// session. Forwards to hostnsoft-api's /auth/switch-company with the access
// token + proxy_auth_token, and applies any refreshed session cookies.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";
  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }
  return switchCompany(companyId);
}
