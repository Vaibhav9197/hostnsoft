import { NextResponse } from "next/server";
import { getApp } from "../../../lib/dummy";

// GET /api/apps/:appId — app detail with deployments + build/deploy events.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const app = getApp(appId);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json({ app });
}

// DELETE /api/apps/:appId — tear down the app. Dummy acknowledgement for now.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const app = getApp(appId);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, message: `${app.name} deleted.` });
}
