import { NextResponse } from "next/server";
import { getApp } from "../../../../lib/dummy";

// POST /api/apps/:appId/redeploy — re-run the latest version.
// Dummy: acknowledges the request; a real impl would enqueue a deployment.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const app = getApp(appId);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    appId,
    message: `Redeploy of ${app.name} queued.`,
  });
}
