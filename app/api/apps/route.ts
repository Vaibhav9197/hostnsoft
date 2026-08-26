import { NextResponse } from "next/server";
import { listApps } from "../../lib/dummy";

// GET /api/apps — list every app in the workspace.
// Dummy data for now; swap listApps() for a real query later.
export function GET() {
  return NextResponse.json({ apps: listApps() });
}
