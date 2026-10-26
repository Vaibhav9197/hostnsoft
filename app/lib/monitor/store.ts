/**
 * D1 reads and writes for monitoring settings, outbox and query triage.
 * Kept free of Next imports so the check run can use it from any caller.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { diffSettings, resolveSettings, type MonitorSettings } from "./settings";

export async function loadSettings(db: D1Database): Promise<{ settings: MonitorSettings; updatedAt: string | null; updatedBy: string | null }> {
  const row = await db
    .prepare("SELECT value, updated_at, updated_by FROM monitor_settings WHERE id = 1")
    .first<{ value: string; updated_at: string; updated_by: string | null }>();
  let stored: unknown = null;
  try {
    stored = row ? JSON.parse(row.value) : null;
  } catch {
    stored = null;
  }
  return { settings: resolveSettings(stored), updatedAt: row?.updated_at ?? null, updatedBy: row?.updated_by ?? null };
}

export async function saveSettings(db: D1Database, next: MonitorSettings, by: string): Promise<number> {
  const { settings: before } = await loadSettings(db);
  const changes = diffSettings(before, next);
  if (changes.length === 0) return 0;
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO monitor_settings (id, value, updated_at, updated_by) VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      )
      .bind(JSON.stringify(next), now, by),
    db.prepare("INSERT INTO monitor_settings_audit (at, by, changes) VALUES (?, ?, ?)").bind(now, by, JSON.stringify(changes)),
  ]);
  return changes.length;
}

export async function settingsHistory(db: D1Database, limit = 20) {
  const { results } = await db
    .prepare("SELECT at, by, changes FROM monitor_settings_audit ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<{ at: string; by: string | null; changes: string }>();
  return results.map((r) => {
    let changes: { path: string; from: unknown; to: unknown }[] = [];
    try {
      changes = JSON.parse(r.changes);
    } catch {}
    return { at: r.at, by: r.by, changes };
  });
}

export async function enqueue(db: D1Database, kind: string, channel: string, text: string): Promise<void> {
  await db
    .prepare("INSERT INTO monitor_outbox (created_at, kind, channel, text) VALUES (?, ?, ?, ?)")
    .bind(new Date().toISOString(), kind, channel || null, text)
    .run();
}

export type QueryStatus = "open" | "resolved" | "wont_fix";
export const QUERY_STATUSES: QueryStatus[] = ["open", "resolved", "wont_fix"];

export async function setQueryStatus(db: D1Database, id: string, status: QueryStatus, by: string): Promise<boolean> {
  const res = await db
    .prepare("UPDATE monitor_queries SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?")
    .bind(status, status === "open" ? null : new Date().toISOString(), status === "open" ? null : by, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
