import { NextResponse } from "next/server";
import { getApp, listEnv } from "../../../../lib/dummy";

// GET /api/apps/:appId/env — environment variables (secret values masked).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  if (!getApp(appId)) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ vars: listEnv(appId) });
}

// POST /api/apps/:appId/env — add or update a variable.
// Body: { key, value, secret }. Dummy acknowledgement (applies on next deploy).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  if (!getApp(appId)) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    return NextResponse.json({ error: "Key must be UPPER_SNAKE_CASE (letters, numbers, underscores)." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: `${key} saved. Applies on the next deploy.` });
}

// DELETE /api/apps/:appId/env — remove a variable. Body: { key }.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  if (!getApp(appId)) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key : "";
  return NextResponse.json({ ok: true, message: `${key} removed.` });
}
