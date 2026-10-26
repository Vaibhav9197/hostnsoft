/**
 * Server-side glue for the /api/monitor routes: env, the D1 handle and the
 * shared guards. Server-only (reads secrets and the Cloudflare context).
 *
 * Every monitor route uses getDb(), reads included: in `next dev` that is the
 * local database the local check run writes to, so the page and the run agree.
 * Deployed it is the production database either way.
 */

import { NextResponse } from "next/server";
import { getDb } from "../db";
import { SITE } from "../site";
import type { TickEnv } from "./tick";

export function monitorDb() {
  return getDb();
}

export function tickEnv(): TickEnv {
  return {
    apiBase: (process.env.HOSTNSOFT_API_URL ?? "http://localhost:4100").replace(/\/$/, ""),
    proxyToken: process.env.MONITOR_PROXY_TOKEN || null,
    healthUrl: `${SITE}/admin/health`,
  };
}

/** Constant-time compare, so the scheduler's secret can't be guessed byte by byte. */
export function secretMatches(given: string | null): boolean {
  const want = process.env.MONITOR_SECRET ?? "";
  if (!want || !given || given.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** A D1 error from a missing table means migration 0006 hasn't been applied. */
export function monitorError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("monitor:", msg);
  if (/no such table: monitor_/.test(msg)) {
    return NextResponse.json(
      { error: "Monitoring tables are missing. Apply migration 0006_monitoring.sql to the D1 database." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Monitoring failed. See the Worker logs." }, { status: 500 });
}
