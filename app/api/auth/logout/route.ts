import { logout } from "../../../lib/api";

export const runtime = "nodejs";

// POST /api/auth/logout — revoke the refresh token upstream and clear cookies.
export async function POST() {
  return logout();
}
