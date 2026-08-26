import { NextResponse } from "next/server";
import { listTokens } from "../../lib/dummy";

// GET /api/tokens — list active deploy tokens (prefixes only).
export function GET() {
  return NextResponse.json({ tokens: listTokens() });
}

// POST /api/tokens — mint a new token. The full secret is returned exactly
// once here; a real impl stores only its hash. Dummy generator for now.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "New token";
  const rand = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  const secret = `hns_live_${rand}`;
  return NextResponse.json({
    token: {
      id: `tok_${rand.slice(0, 8)}`,
      name,
      tokenPrefix: secret.slice(0, 13),
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    },
    secret,
  });
}
