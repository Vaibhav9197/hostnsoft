/**
 * Alert rules. Each turns the latest readings into zero or more firing
 * alerts; tick.ts decides which of them to send (see alerts.ts).
 *
 * Pure: the readings are gathered by tick.ts, so the rules can be tested
 * with plain objects.
 */

import type { Level, MonitorSettings, RuleId } from "./settings";

export interface Readings {
  /** Failed checks in a row, per health target id. */
  healthStreaks: Record<string, { name: string; failures: number; lastError: string | null }>;
  /** Failed app-list reads in a row. */
  appsReadFailures: number;
  appsReadError: string | null;
  lastHour: { deploys: number; failed: number };
  tempOverdue: string[];
  /** Last 24 hours vs the usual day, for the trend rules. */
  trends: Record<"deploys" | "temp_apps" | "new_workspaces", { last24: number; usual: number | null }>;
  historyDays: number;
  queriesOverdue: number;
  /** Platform bug reports still open, with hours open. */
  bugReports: { id: string; hours: number; project: string | null }[];
}

export interface Firing {
  key: string;
  rule: RuleId;
  level: Level;
  title: string;
  /** What to do about it, one line. */
  action: string;
}

const TREND_RULE = {
  deploys: "deploys_change",
  temp_apps: "temp_apps_change",
  new_workspaces: "new_workspaces_change",
} as const;

const TREND_NAME = { deploys: "Deploys", temp_apps: "Temporary apps created", new_workspaces: "New workspaces" };

export function evaluate(r: Readings, s: MonitorSettings): Firing[] {
  const out: Firing[] = [];
  const on = (id: RuleId) => s.rules[id].enabled;

  if (on("service_down")) {
    const rule = s.rules.service_down;
    for (const [id, h] of Object.entries(r.healthStreaks)) {
      if (h.failures >= rule.threshold) {
        out.push({
          key: `service_down:${id}`,
          rule: "service_down",
          level: rule.level,
          title: `${h.name} is down: ${h.failures} checks failed in a row${h.lastError ? ` (${h.lastError})` : ""}`,
          action: "Check the server and its logs.",
        });
      }
    }
  }

  if (on("monitor_blind") && r.appsReadFailures >= s.rules.monitor_blind.threshold) {
    out.push({
      key: "monitor_blind",
      rule: "monitor_blind",
      level: s.rules.monitor_blind.level,
      title: `Monitoring can't read app data: ${r.appsReadFailures} reads failed${r.appsReadError ? ` (${r.appsReadError})` : ""}`,
      action: "Check the API, or renew the monitor's sign-in token (MONITOR_PROXY_TOKEN).",
    });
  }

  const rate = s.rules.deploy_failure_rate;
  if (on("deploy_failure_rate") && r.lastHour.deploys >= Math.max(1, rate.minVolume)) {
    const pct = Math.round((r.lastHour.failed / r.lastHour.deploys) * 100);
    if (pct >= rate.threshold) {
      out.push({
        key: "deploy_failure_rate",
        rule: "deploy_failure_rate",
        level: rate.level,
        title: `${pct}% of deploys failed in the last hour (${r.lastHour.failed} of ${r.lastHour.deploys})`,
        action: "Open the Health page to see which apps and agents are failing.",
      });
    }
  }

  const overdue = s.rules.temp_cleanup_overdue;
  if (on("temp_cleanup_overdue") && r.tempOverdue.length >= overdue.threshold) {
    const names = r.tempOverdue.slice(0, 3).join(", ") + (r.tempOverdue.length > 3 ? ` and ${r.tempOverdue.length - 3} more` : "");
    out.push({
      key: "temp_cleanup_overdue",
      rule: "temp_cleanup_overdue",
      level: overdue.level,
      title: `${r.tempOverdue.length} temporary app${r.tempOverdue.length === 1 ? " is" : "s are"} past expiry and still online: ${names}`,
      action: "Expiry cleanup in hostnsoft-api may be stuck. Check its logs.",
    });
  }

  for (const key of Object.keys(TREND_RULE) as (keyof typeof TREND_RULE)[]) {
    const id = TREND_RULE[key];
    const rule = s.rules[id];
    const t = r.trends[key];
    if (!rule.enabled || t.usual === null || t.usual < Math.max(1, rule.minVolume)) continue;
    const change = Math.round(((t.last24 - t.usual) / t.usual) * 100);
    if (Math.abs(change) < rule.threshold) continue;
    // Trend rules learn what "usual" is first; until then they only inform.
    const level: Level = r.historyDays < s.warmupDays ? "info" : rule.level;
    out.push({
      key: `${id}:${change > 0 ? "up" : "down"}`,
      rule: id,
      level,
      title: `${TREND_NAME[key]} ${change > 0 ? "up" : "down"} ${Math.abs(change)}%: ${t.last24} in 24h vs ${Math.round(t.usual)} on a usual day`,
      action: change > 0 ? "Check whether it's real growth or something stuck in a loop." : "Check the deploy flow and the landing pages.",
    });
  }

  const q = s.rules.queries_overdue;
  if (on("queries_overdue") && r.queriesOverdue >= q.threshold) {
    out.push({
      key: "queries_overdue",
      rule: "queries_overdue",
      level: q.level,
      title: `${r.queriesOverdue} customer quer${r.queriesOverdue === 1 ? "y is" : "ies are"} open for more than ${s.queries.overdueHours} hours`,
      action: "Reply, then mark them resolved on the Health page.",
    });
  }

  const bug = s.rules.bug_report_open;
  if (on("bug_report_open")) {
    for (const b of r.bugReports) {
      if (b.hours < bug.threshold) continue;
      out.push({
        key: `bug_report_open:${b.id}`,
        rule: "bug_report_open",
        level: bug.level,
        title: `Bug report open for ${Math.floor(b.hours)} hours${b.project ? ` (${b.project})` : ""}`,
        action: "Read it on the Health page, then fix or mark it resolved.",
      });
    }
  }

  return out;
}
