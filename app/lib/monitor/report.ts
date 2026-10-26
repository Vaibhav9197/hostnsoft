/**
 * The daily and weekly Slack reports, as Slack mrkdwn text.
 *
 * Short on purpose: one line per area, a status line first, and a link to
 * the Health page for anything deeper. Missing data reads "no data", never 0.
 *
 * Pure: takes Summary objects from metrics.ts.
 */

import type { Summary } from "./metrics";
import type { AlertState } from "./alerts";
import type { Firing } from "./rules";
import { dayLabel } from "./time";

const fmt = (n: number) => n.toLocaleString("en-US");

function dataNote(s: Summary): string | null {
  if (s.data.since && s.data.since > s.from) {
    return "ℹ️ Monitoring started during this period: deploys, kept, expired and uptime count only from then. New apps and workspaces use real dates.";
  }
  if (s.data.state === "none") return "⚠️ *No data* from checks in this period: deploys, kept, expired and uptime are unknown.";
  if (s.data.state === "partial") return `⚠️ Partial data: ${s.data.coverage}% of checks ran, so check-based counts may be low.`;
  return null;
}

/** "12 (▲ 20%)" against last period's value. */
function vs(now: number, before: number | null, kind: "pct" | "pts" = "pct"): string {
  if (before === null) return fmt(now);
  if (kind === "pts") {
    const d = Math.round((now - before) * 10) / 10;
    return d === 0 ? `${now}% (same)` : `${now}% (${d > 0 ? "▲" : "▼"} ${Math.abs(d)} pts)`;
  }
  if (before === 0) return now === 0 ? "0" : `${fmt(now)} (new)`;
  const d = Math.round(((now - before) / before) * 100);
  return d === 0 ? `${fmt(now)} (same)` : `${fmt(now)} (${d > 0 ? "▲" : "▼"} ${Math.abs(d)}%)`;
}

function uptimeLine(s: Summary): string {
  const parts = s.health.map((h) => `${h.name} ${h.uptime === null ? "no data" : `${h.uptime}%`}`);
  return parts.length ? parts.join(" · ") : "no checks set up";
}

const opt = (n: number | null) => (n === null ? "no data" : fmt(n));

function statusLine(open: AlertState[]): string {
  const loud = open.filter((a) => a.level !== "info");
  if (loud.length === 0) return "🟢 Nothing needs you right now.";
  const critical = loud.filter((a) => a.level === "critical").length;
  const head = critical > 0 ? `🔴 ${loud.length} open alert${loud.length > 1 ? "s" : ""}` : `🟠 ${loud.length} open warning${loud.length > 1 ? "s" : ""}`;
  return `${head}:\n${loud.slice(0, 5).map((a) => `• ${a.title}`).join("\n")}`;
}

export function dailyReport(args: {
  summary: Summary;
  open: AlertState[];
  /** Info-level and trend findings, which only appear here. */
  notes: Firing[];
  nowMs: number;
  timezone: string;
  healthUrl: string;
}): string {
  const { summary: s, open, notes, nowMs, timezone, healthUrl } = args;
  const lines = [`*Embarko daily · ${dayLabel(nowMs, timezone)}*`, statusLine(open)];
  const note = dataNote(s);
  if (note) lines.push(note);

  // New apps, temporary apps created and workspaces come from real creation
  // dates; deploys, kept and expired only exist where checks ran.
  const none = s.data.state === "none";
  lines.push(
    "",
    none
      ? `*Apps* ${fmt(s.apps.created)} new · deploys: no data`
      : `*Apps* ${fmt(s.apps.created)} new · ${fmt(s.apps.deploys)} deploys · ${fmt(s.apps.failed)} failed${s.apps.failureRate !== null ? ` (${s.apps.failureRate}%)` : ""}`,
    none
      ? `*Temporary apps* ${fmt(s.temp.created)} created · kept and expired: no data · ${opt(s.temp.activeNow)} online now`
      : `*Temporary apps* ${fmt(s.temp.created)} created · ${fmt(s.temp.claimed)} kept · ${fmt(s.temp.expired)} expired${s.temp.expiredEarly ? ` (${s.temp.expiredEarly} early)` : ""} · ${opt(s.temp.activeNow)} online now`,
    `*New workspaces* ${fmt(s.workspaces.firstApp)} deployed their first app`,
  );
  lines.push(
    s.live.live === null ? "*Live now* no data" : `*Live now* ${fmt(s.live.live)} live · ${opt(s.live.failing)} failing`,
    `*Customer queries* ${fmt(s.queries.created)} new · ${fmt(s.queries.openNow)} open · ${fmt(s.queries.overdueNow)} overdue`,
    `*Uptime* ${uptimeLine(s)}`,
  );
  if (s.web) lines.push(`*Website* ${fmt(s.web.visitors)} visitors · ${fmt(s.web.promptCopies)} copied the prompt`);
  lines.push("*Signups* not tracked yet");

  if (notes.length) {
    lines.push("", "*Worth knowing*", ...notes.slice(0, 5).map((f) => `• ${f.title}`));
  }
  lines.push("", `<${healthUrl}|Open Health page>`);
  return lines.join("\n");
}

/** Up to three plain next steps, picked from what moved most this week. */
export function recommendations(cur: Summary, prev: Summary): string[] {
  const out: string[] = [];
  const top = cur.apps.bySource.filter((x) => x.failed > 0).sort((a, b) => b.failed - a.failed)[0];

  if (cur.apps.failureRate !== null && (cur.apps.failureRate >= 15 || (prev.data.complete && prev.apps.failureRate !== null && cur.apps.failureRate - prev.apps.failureRate >= 5))) {
    out.push(`Deploy failures are at ${cur.apps.failureRate}%.${top ? ` Most come from ${top.source} (${top.failed}).` : ""} Read their errors and fix the agent guide or the deploy step behind them.`);
  }
  if (cur.temp.created >= 10 && cur.temp.keptRate !== null && cur.temp.keptRate < 20) {
    out.push(`Only ${cur.temp.keptRate}% of temporary apps are kept. Make "keep this app" clearer on the banner and the claim page.`);
  }
  if (cur.queries.overdueNow > 0) {
    out.push(`${cur.queries.overdueNow} customer quer${cur.queries.overdueNow === 1 ? "y is" : "ies are"} overdue. Reply to those first.`);
  }
  if (prev.workspaces.firstApp >= 3 && cur.workspaces.firstApp < prev.workspaces.firstApp * 0.8) {
    out.push(`New workspaces fell from ${prev.workspaces.firstApp} to ${cur.workspaces.firstApp}. Check website traffic and how many people copy the prompt.`);
  }
  if (cur.web && prev.web && prev.web.visitors > 0 && cur.web.visitors >= prev.web.visitors && cur.web.promptCopies < prev.web.promptCopies * 0.8) {
    out.push("More visitors but fewer prompt copies. The landing pages are converting worse; check the A/B dashboard.");
  }
  const weak = cur.health.find((h) => h.uptime !== null && h.uptime < 99.5);
  if (weak) out.push(`${weak.name} uptime was ${weak.uptime}%. Look at what went down and why.`);
  if (cur.temp.expiredEarly > 0) out.push(`${cur.temp.expiredEarly} temporary apps disappeared before their time. Check expiry cleanup.`);
  if (prev.temp.created > 0 && cur.temp.created >= prev.temp.created * 1.3) {
    out.push(`Temporary apps are up ${Math.round(((cur.temp.created - prev.temp.created) / prev.temp.created) * 100)}%. No-login deploys are working; push more of them to sign up and keep the app.`);
  }
  return out.slice(0, 3);
}

export function weeklyReport(args: {
  cur: Summary;
  prev: Summary;
  open: AlertState[];
  fromMs: number;
  toMs: number;
  timezone: string;
  healthUrl: string;
}): string {
  const { cur, prev, open, fromMs, toMs, timezone, healthUrl } = args;
  // Creation-date numbers compare with any week; check-based ones only with a
  // week monitoring fully covered.
  const p = (v: number) => v;
  const pc = (v: number) => (prev.data.complete ? v : null);
  const success = (s: Summary) => (s.apps.failureRate === null ? null : Math.round((100 - s.apps.failureRate) * 10) / 10);
  const curSuccess = success(cur);
  const prevSuccess = prev.data.complete ? success(prev) : null;

  const lines = [`*Embarko weekly · ${dayLabel(fromMs, timezone)} – ${dayLabel(toMs - 1, timezone)}*`, statusLine(open)];
  const note = dataNote(cur);
  if (note) lines.push(note);
  if (!prev.data.complete) lines.push("Monitoring didn't cover the week before yet, so deploys and success rate have nothing to compare with.");

  const sources = cur.apps.bySource.slice(0, 4).map((x) => `${x.source} ${fmt(x.deploys)}`).join(" · ") || "none";

  lines.push(
    "",
    "*Growth*",
    `New workspaces ${vs(cur.workspaces.firstApp, p(prev.workspaces.firstApp))}`,
    cur.web
      ? `Website visitors ${vs(cur.web.visitors, prev.web ? p(prev.web.visitors) : null)} · prompt copies ${vs(cur.web.promptCopies, prev.web ? p(prev.web.promptCopies) : null)}`
      : "Website: no data",
    "Signups: not tracked yet",
    "",
    "*Apps*",
    `New apps ${vs(cur.apps.created, p(prev.apps.created))} · deploys ${vs(cur.apps.deploys, pc(prev.apps.deploys))}`,
    `Deploy success ${curSuccess === null ? "no deploys" : vs(curSuccess, prevSuccess, "pts")}`,
    `Top sources: ${sources}`,
    cur.live.live === null ? "Live now: no data" : `Live now ${fmt(cur.live.live)} of ${opt(cur.live.total)} apps`,
    "",
    "*Temporary apps*",
    `Created ${vs(cur.temp.created, p(prev.temp.created))} · kept ${fmt(cur.temp.claimed)}${cur.temp.keptRate !== null ? ` (${cur.temp.keptRate}% of this week's)` : ""} · expired ${fmt(cur.temp.expired)}`,
    "",
    "*Customer queries*",
    `New ${vs(cur.queries.created, p(prev.queries.created))} · resolved ${fmt(cur.queries.resolved)} · open ${fmt(cur.queries.openNow)} · overdue ${fmt(cur.queries.overdueNow)}${cur.queries.medianHoursToResolve !== null ? ` · ${cur.queries.medianHoursToResolve} h to resolve (median)` : ""}`,
    "",
    `*Uptime* ${uptimeLine(cur)}`,
  );

  const recs = recommendations(cur, prev);
  lines.push("", "*What to look at*", ...(recs.length ? recs.map((r, i) => `${i + 1}. ${r}`) : ["Nothing stands out this week."]));
  lines.push("", `<${healthUrl}|Open Health page>`);
  return lines.join("\n");
}
