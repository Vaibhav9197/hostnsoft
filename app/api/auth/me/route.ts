import { me } from "../../../lib/api";

export const runtime = "nodejs";

// GET /api/auth/me — current identity. Comes from hostnsoft-api when reachable
// (with companies), otherwise from the MSG91 proxy session. Returns 401 only
// when there's no valid session at all.
export async function GET() {
  return me();
}
