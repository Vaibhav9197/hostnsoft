/**
 * Decides which firing alerts go to Slack now, so one problem is one message:
 * - new → sent at once (critical) or after quiet hours (warning);
 * - still firing → sent again only when it gets worse or after its repeat time;
 * - cleared → one "Resolved" message, if the alert was ever sent;
 * - info → never sent on its own; it waits for the daily report.
 *
 * Pure: the caller loads and saves monitor_alerts.
 */

import type { Firing } from "./rules";
import type { Level, MonitorSettings } from "./settings";
import { HOUR } from "./time";

export interface AlertState {
  key: string;
  rule: string;
  level: Level;
  state: "open" | "resolved";
  title: string;
  detail: string | null;
  first_at: string;
  last_at: string;
  sent_at: string | null;
  sent_level: Level | null;
  resolved_at: string | null;
}

export interface AlertMessage {
  level: Level;
  channel: string;
  text: string;
}

const RANK: Record<Level, number> = { info: 0, warning: 1, critical: 2 };
const ICON: Record<Level, string> = { critical: "🔴", warning: "🟠", info: "🔵" };
const NAME: Record<Level, string> = { critical: "Critical", warning: "Warning", info: "Info" };

function since(fromIso: string, nowMs: number): string {
  const m = Math.max(1, Math.round((nowMs - Date.parse(fromIso)) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}

export function alertText(f: { level: Level; title: string; action: string; anchor?: string }, healthUrl: string): string {
  // An alert about one thing links straight to it; the rest open the page.
  const link = f.anchor ? `<${healthUrl}${f.anchor}|Open the report>` : `<${healthUrl}|Open Health page>`;
  return `${ICON[f.level]} *${NAME[f.level]}* · ${f.title}\n→ ${f.action} ${link}`;
}

export function decide(
  firings: Firing[],
  stored: AlertState[],
  nowMs: number,
  s: MonitorSettings,
  quiet: boolean,
  healthUrl: string,
): { upserts: AlertState[]; messages: AlertMessage[] } {
  const now = new Date(nowMs).toISOString();
  const byKey = new Map(stored.map((a) => [a.key, a]));
  const upserts: AlertState[] = [];
  const messages: AlertMessage[] = [];
  const channel = (level: Level) => (level === "critical" ? s.channels.critical : s.channels.warning);
  const firingKeys = new Set<string>();

  for (const f of firings) {
    firingKeys.add(f.key);
    const old = byKey.get(f.key);
    const fresh = !old || old.state === "resolved";
    const a: AlertState = fresh
      ? { key: f.key, rule: f.rule, level: f.level, state: "open", title: f.title, detail: f.action, first_at: now, last_at: now, sent_at: null, sent_level: null, resolved_at: null }
      : { ...old, level: f.level, title: f.title, detail: f.action, last_at: now };

    const repeatMs = (s.rules[f.rule]?.repeatHours ?? 24) * HOUR;
    const due =
      a.sent_at === null ||
      RANK[f.level] > RANK[a.sent_level ?? "info"] ||
      nowMs - Date.parse(a.sent_at) >= repeatMs;
    const held = f.level === "warning" && quiet;

    if (f.level !== "info" && due && !held) {
      const repeat = a.sent_at !== null ? ` (still happening, ${since(a.first_at, nowMs)})` : "";
      messages.push({ level: f.level, channel: channel(f.level), text: alertText({ ...f, title: f.title + repeat }, healthUrl) });
      a.sent_at = now;
      a.sent_level = f.level;
    }
    upserts.push(a);
  }

  for (const old of stored) {
    if (old.state !== "open" || firingKeys.has(old.key)) continue;
    const a: AlertState = { ...old, state: "resolved", resolved_at: now, last_at: now };
    const level = old.sent_level ?? old.level;
    if (old.sent_at && level !== "info" && !(level === "warning" && quiet)) {
      messages.push({
        level,
        channel: channel(level),
        text: `✅ *Resolved* after ${since(old.first_at, nowMs)} · ${old.title}`,
      });
    }
    upserts.push(a);
  }

  return { upserts, messages };
}
