import { refreshSession } from "../../../lib/api";

export const runtime = "nodejs";

// POST /api/auth/refresh — rotate the refresh cookie and mint a new access
// token. Returns 401 (and clears cookies) when the session is over.
export async function POST() {
  return refreshSession();
}
