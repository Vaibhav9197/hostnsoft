import { NextResponse } from "next/server";
import { getApp } from "../../../../lib/dummy";

// POST /api/apps/:appId/rollback — promote a prior version back to live.
// Body: { version: string }. Dummy acknowledgement for now.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const app = getApp(appId);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const version = typeof body?.version === "string" ? body.version : null;
  if (!version) {
    return NextResponse.json({ error: "A target version is required." }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    appId,
    version,
    message: `Rolling ${app.name} back to ${version}.`,
  });
}
