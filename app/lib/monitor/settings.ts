/**
 * Monitoring settings: what /admin/monitoring edits, with the defaults the
 * monitor runs on until someone changes them.
 *
 * Stored as one JSON row in D1 (monitor_settings) and always merged over
 * DEFAULTS here, so a setting added later has a value on day one and a stored
 * value that no longer validates falls back instead of breaking the monitor.
 *
 * Pure: no Next or Cloudflare imports, so scripts can load it too.
 */

import { SITE, SHIP_HOST } from "../site";

export type Level = "critical" | "warning" | "info";
export const LEVELS: Level[] = ["critical", "warning", "info"];

export type RuleId =
  | "service_down"
  | "monitor_blind"
  | "deploy_failure_rate"
  | "temp_cleanup_overdue"
  | "deploys_change"
  | "temp_apps_change"
  | "new_workspaces_change"
  | "queries_overdue"
  | "bug_report_open";

export interface RuleSettings {
  enabled: boolean;
  level: Level;
  /** What trips the rule; its unit is the catalogue entry's `unit`. */
  threshold: number;
  /** Below this much activity the rule stays quiet. Unused by some rules. */
  minVolume: number;
  /** Hours before a still-firing alert is sent again. */
  repeatHours: number;
}

export interface RuleInfo {
  id: RuleId;
  name: string;
  /** One line, in plain words, for the settings page. */
  description: string;
  thresholdLabel: string;
  /** Null when the rule has no minimum. */
  minVolumeLabel: string | null;
  /** Trend rules compare with the usual level and wait for warm-up. */
  trend: boolean;
  defaults: RuleSettings;
}

export const RULES: RuleInfo[] = [
  {
    id: "service_down",
    name: "Service down",
    description: "A health check (site, API, deploy service or one you added) fails several times in a row.",
    thresholdLabel: "Failed checks in a row",
    minVolumeLabel: null,
    trend: false,
    defaults: { enabled: true, level: "critical", threshold: 2, minVolume: 0, repeatHours: 1 },
  },
  {
    id: "monitor_blind",
    name: "Monitor can't read app data",
    description: "The monitor can't read the app list from the API, so every number goes stale.",
    thresholdLabel: "Failed reads in a row",
    minVolumeLabel: null,
    trend: false,
    defaults: { enabled: true, level: "critical", threshold: 3, minVolume: 0, repeatHours: 6 },
  },
  {
    id: "deploy_failure_rate",
    name: "Deploys failing",
    description: "Too many deploys failed in the last hour.",
    thresholdLabel: "Failure rate (%)",
    minVolumeLabel: "Only when at least this many deploys",
    trend: false,
    defaults: { enabled: true, level: "critical", threshold: 50, minVolume: 5, repeatHours: 3 },
  },
  {
    id: "temp_cleanup_overdue",
    name: "Temporary apps not cleaned up",
    description: "Temporary apps are still online after they should have expired.",
    thresholdLabel: "Overdue apps",
    minVolumeLabel: null,
    trend: false,
    defaults: { enabled: true, level: "warning", threshold: 1, minVolume: 0, repeatHours: 6 },
  },
  {
    id: "deploys_change",
    name: "Deploys up or down",
    description: "Deploys in the last 24 hours moved a lot compared with a usual day.",
    thresholdLabel: "Change vs usual (%)",
    minVolumeLabel: "Only when a usual day has at least",
    trend: true,
    defaults: { enabled: true, level: "warning", threshold: 60, minVolume: 10, repeatHours: 24 },
  },
  {
    id: "temp_apps_change",
    name: "Temporary apps up or down",
    description: "Temporary apps created in the last 24 hours moved a lot compared with a usual day.",
    thresholdLabel: "Change vs usual (%)",
    minVolumeLabel: "Only when a usual day has at least",
    trend: true,
    defaults: { enabled: true, level: "warning", threshold: 60, minVolume: 5, repeatHours: 24 },
  },
  {
    id: "new_workspaces_change",
    name: "New workspaces up or down",
    description: "Workspaces deploying their first app moved a lot compared with a usual day.",
    thresholdLabel: "Change vs usual (%)",
    minVolumeLabel: "Only when a usual day has at least",
    trend: true,
    defaults: { enabled: true, level: "info", threshold: 60, minVolume: 3, repeatHours: 24 },
  },
  {
    id: "queries_overdue",
    name: "Customer queries overdue",
    description: "Customer queries are still open past the overdue time.",
    thresholdLabel: "Overdue queries",
    minVolumeLabel: null,
    trend: false,
    defaults: { enabled: true, level: "warning", threshold: 1, minVolume: 0, repeatHours: 24 },
  },
  {
    id: "bug_report_open",
    name: "Bug report waiting",
    description: "Someone reported a platform bug and it is still open.",
    thresholdLabel: "Hours open",
    minVolumeLabel: null,
    trend: false,
    defaults: { enabled: true, level: "warning", threshold: 4, minVolume: 0, repeatHours: 12 },
  },
];

export const RULE_IDS = RULES.map((r) => r.id);

export interface HealthTarget {
  id: string;
  name: string;
  url: string;
}

export interface MonitorSettings {
  timezone: string;
  reports: {
    daily: { enabled: boolean; time: string };
    /** day: 0 = Sunday … 6 = Saturday. */
    weekly: { enabled: boolean; day: number; time: string };
  };
  /** Slack channel names or ids. Empty means the scheduler's default channel. */
  channels: { critical: string; warning: string; reports: string };
  /** Warnings wait until quiet hours end. Critical alerts always go out. */
  quietHours: { enabled: boolean; start: string; end: string };
  health: { targets: HealthTarget[]; timeoutMs: number };
  queries: { overdueHours: number };
  tempApps: { ttlHours: number; cleanupGraceHours: number };
  /** Days of history before trend alerts leave info-only. */
  warmupDays: number;
  rules: Record<RuleId, RuleSettings>;
}

export const DEFAULTS: MonitorSettings = {
  timezone: "Asia/Kolkata",
  reports: {
    daily: { enabled: true, time: "09:30" },
    weekly: { enabled: true, day: 1, time: "09:30" },
  },
  channels: { critical: "", warning: "", reports: "" },
  quietHours: { enabled: true, start: "22:00", end: "08:00" },
  health: {
    targets: [
      { id: "site", name: "Website", url: `${SITE}/` },
      { id: "api", name: "API", url: `https://${SHIP_HOST}/api/health` },
      { id: "deploy", name: "Deploy service", url: `https://${SHIP_HOST}/health` },
    ],
    timeoutMs: 8000,
  },
  queries: { overdueHours: 48 },
  tempApps: { ttlHours: 24, cleanupGraceHours: 2 },
  warmupDays: 14,
  rules: Object.fromEntries(RULES.map((r) => [r.id, { ...r.defaults }])) as Record<RuleId, RuleSettings>,
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

function isTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Checks a full settings object. Returns plain-words problems keyed by the
 * field's path, so the settings page can put each one next to its field.
 */
export function validate(s: MonitorSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  const num = (path: string, v: number, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
      errors[path] = `Use a number from ${min} to ${max}.`;
    }
  };

  if (!isTimezone(s.timezone)) errors.timezone = "Not a time zone. Try Asia/Kolkata or UTC.";
  if (!HM.test(s.reports.daily.time)) errors["reports.daily.time"] = "Use 24-hour time, like 09:30.";
  if (!HM.test(s.reports.weekly.time)) errors["reports.weekly.time"] = "Use 24-hour time, like 09:30.";
  num("reports.weekly.day", s.reports.weekly.day, 0, 6);
  if (!HM.test(s.quietHours.start)) errors["quietHours.start"] = "Use 24-hour time, like 22:00.";
  if (!HM.test(s.quietHours.end)) errors["quietHours.end"] = "Use 24-hour time, like 08:00.";
  for (const k of ["critical", "warning", "reports"] as const) {
    const c = s.channels[k];
    if (typeof c !== "string" || c.length > 80 || /\s/.test(c)) errors[`channels.${k}`] = "A channel name or id, no spaces.";
  }

  num("health.timeoutMs", s.health.timeoutMs, 1000, 20000);
  if (!Array.isArray(s.health.targets) || s.health.targets.length > 10) {
    errors["health.targets"] = "Up to 10 checks.";
  } else {
    const ids = new Set<string>();
    s.health.targets.forEach((t, i) => {
      if (!t.name?.trim()) errors[`health.targets.${i}.name`] = "Give it a name.";
      let url: URL | null = null;
      try {
        url = new URL(t.url);
      } catch {}
      if (!url || url.protocol !== "https:") errors[`health.targets.${i}.url`] = "Use a full https:// address.";
      if (!/^[a-z0-9-]{1,32}$/.test(t.id) || ids.has(t.id)) errors[`health.targets.${i}.id`] = "Needs a unique id.";
      ids.add(t.id);
    });
  }

  num("queries.overdueHours", s.queries.overdueHours, 1, 720);
  num("tempApps.ttlHours", s.tempApps.ttlHours, 1, 720);
  num("tempApps.cleanupGraceHours", s.tempApps.cleanupGraceHours, 0, 72);
  num("warmupDays", s.warmupDays, 0, 60);

  for (const info of RULES) {
    const r = s.rules[info.id];
    const p = `rules.${info.id}`;
    if (!r) {
      errors[p] = "Missing.";
      continue;
    }
    if (!LEVELS.includes(r.level)) errors[`${p}.level`] = "Pick critical, warning or info.";
    // A threshold of 0 would fire on every check.
    num(`${p}.threshold`, r.threshold, 1, info.thresholdLabel.includes("%") ? 1000 : 10000);
    num(`${p}.minVolume`, r.minVolume, 0, 100000);
    num(`${p}.repeatHours`, r.repeatHours, 1, 168);
  }
  return errors;
}

/** Deep-merges `over` onto `base`, keeping base's shape and types. Arrays replace. */
function merge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) {
    if (over === undefined || over === null) return base;
    if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
    return (typeof over === typeof base ? over : base) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) out[key] = merge((base as Record<string, unknown>)[key], over[key]);
  return out as T;
}

/**
 * Stored JSON → settings the monitor can run on. Each top-level section that
 * no longer validates falls back to its default on its own, so one bad value
 * never switches off the rest.
 */
export function resolveSettings(stored: unknown): MonitorSettings {
  const merged = merge(DEFAULTS, stored);
  const errors = validate(merged);
  if (Object.keys(errors).length === 0) return merged;
  const fixed = { ...merged } as Record<string, unknown>;
  for (const path of Object.keys(errors)) {
    const [top, second] = path.split(".");
    if (top === "rules" && second) {
      (fixed.rules as Record<string, RuleSettings>) = {
        ...(fixed.rules as Record<string, RuleSettings>),
        [second]: { ...DEFAULTS.rules[second as RuleId] },
      };
    } else {
      fixed[top] = structuredClone((DEFAULTS as unknown as Record<string, unknown>)[top]);
    }
  }
  return fixed as unknown as MonitorSettings;
}

/** Strict parse of what the settings page sends. Unlike resolveSettings, it refuses instead of fixing. */
export function parseSubmitted(input: unknown): { settings: MonitorSettings; errors: Record<string, string> } {
  const settings = merge(DEFAULTS, input);
  return { settings, errors: validate(settings) };
}

/** Flat list of what changed between two settings objects, for the audit log. */
export function diffSettings(before: MonitorSettings, after: MonitorSettings): { path: string; from: unknown; to: unknown }[] {
  const out: { path: string; from: unknown; to: unknown }[] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if (isObj(a) && isObj(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], path ? `${path}.${k}` : k);
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ path, from: a, to: b });
    }
  };
  walk(before, after, "");
  return out;
}
