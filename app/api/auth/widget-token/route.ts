import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PAT_COOKIE } from "../../../lib/api";

export const runtime = "nodejs";

// GET /api/auth/widget-token — hands the session's MSG91 proxy_auth_token to
// the browser.
//
// Every other route keeps the PAT server-side in an httpOnly cookie on purpose.
// The proxy's user-management widget is the one exception: it runs in the page
// and takes the token as its `authToken` config field, so there is no way to
// mount it without reading the cookie out. Nothing else should call this.
export async function GET() {
  const jar = await cookies();
  const token = jar.get(PAT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(
    { authToken: token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
