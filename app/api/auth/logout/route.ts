import { logout } from "../../../lib/api";

export const runtime = "nodejs";

// POST /api/auth/logout — revoke the proxy session upstream and clear the cookie.
export async function POST() {
  return logout();
}
