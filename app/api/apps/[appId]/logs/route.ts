import { NextResponse } from "next/server";
import { getApp } from "../../../../lib/dummy";

type LogLine = { ts: string; level: "info" | "warn" | "error"; message: string };

// GET /api/apps/:appId/logs — recent runtime (stdout/stderr) log lines.
// Dummy stream for now; a real impl would proxy the platform's live logs.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const app = getApp(appId);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const base = Date.parse(app.lastDeployAt ?? app.createdAt);
  const at = (secAgo: number) => new Date(base - secAgo * 1000).toISOString();

  let lines: LogLine[];
  if (app.status === "crashed") {
    lines = [
      { ts: at(52), level: "info", message: `Starting ${app.name} on 0.0.0.0:$PORT` },
      { ts: at(48), level: "info", message: "Connected to PGlite at $DATA_DIR/pglite" },
      { ts: at(30), level: "warn", message: "Memory usage 241 MB / 256 MB" },
      { ts: at(6), level: "error", message: "FATAL: JavaScript heap out of memory" },
      { ts: at(4), level: "error", message: "Process exited with code 137" },
      { ts: at(3), level: "warn", message: "Restarting (attempt 3/3)…" },
    ];
  } else if (app.status === "building") {
    lines = [
      { ts: at(20), level: "info", message: "Build in progress — installing dependencies" },
      { ts: at(8), level: "info", message: "Compiling sources…" },
    ];
  } else {
    lines = [
      { ts: at(120), level: "info", message: `Starting ${app.name} on 0.0.0.0:$PORT` },
      { ts: at(118), level: "info", message: app.hasDatabase ? "Connected to PGlite at $DATA_DIR/pglite" : "No database configured" },
      { ts: at(116), level: "info", message: "Ready — accepting connections" },
      { ts: at(74), level: "info", message: 'GET / 200 — 12ms' },
      { ts: at(51), level: "info", message: 'GET /api/health 200 — 3ms' },
      { ts: at(33), level: "info", message: 'POST /submit 201 — 41ms' },
      { ts: at(19), level: "warn", message: 'GET /favicon.ico 404 — 2ms' },
      { ts: at(7), level: "info", message: 'GET / 200 — 9ms' },
    ];
  }

  return NextResponse.json({ lines });
}
