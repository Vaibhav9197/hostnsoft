/**
 * Turns two looks at the app list into what happened in between.
 *
 * hostnsoft-api answers GET /admin/apps with every app as it is now, and keeps
 * no history: an expired temporary app is hard-deleted and a claim leaves no
 * trace. Comparing each check with the last one is the only way to know when
 * a temporary app was created, kept or expired.
 *
 * Known blind spots, by design of the upstream data:
 * - Deploys of temporary apps are not recorded upstream, so they never count
 *   as deploys here; a temporary app counts once, when it first appears.
 * - Several deploys of one app between two checks count as several deploys,
 *   but only the latest one's outcome is known, so at most one counts as failed.
 *
 * Pure: no D1, no fetch.
 */

/** What GET /admin/apps answers per app. */
export interface UpstreamApp {
  appSlug: string;
  companyName?: string | null;
  createdAt?: string | null;
  deploymentCount?: number | null;
  lastDeploySource?: string | null;
  lastDeployAgentName?: string | null;
  status?: string | null;
}

/** The label hostnsoft-api gives an app with no workspace: a temporary app. */
export const TEMP_COMPANY = "Unclaimed (orphan)";

export interface AppRow {
  slug: string;
  company: string | null;
  is_temp: number;
  was_temp: number;
  created_at: string | null;
  status: string | null;
  deploy_count: number;
  last_source: string | null;
  last_agent: string | null;
  first_seen_at: string;
  last_seen_at: string;
  claimed_at: string | null;
  gone_at: string | null;
}

export type EventKind =
  | "app_created"
  | "deploy"
  | "deploy_failed"
  | "temp_claimed"
  | "temp_expired"
  | "app_deleted"
  | "workspace_first_app";

export interface MonitorEvent {
  at: string;
  kind: EventKind;
  app_slug: string;
  is_temp: number;
  source: string | null;
  detail: string | null;
}

export interface DiffResult {
  rows: AppRow[];
  events: MonitorEvent[];
  /** Set when the new list looks wrong and nothing should be written. */
  refused: string | null;
}

/** Where a deploy came from, in the words reports use. */
export function sourceOf(app: { last_source: string | null; last_agent: string | null; is_temp: number }): string {
  if (app.is_temp) return "no login";
  if (app.last_source === "dashboard") return "dashboard";
  if (app.last_source === "agent") return app.last_agent?.trim() || "AI agent";
  return "unknown";
}

export function diffApps(
  prev: AppRow[],
  current: UpstreamApp[],
  nowIso: string,
  opts: { tempTtlHours: number },
): DiffResult {
  const prevBySlug = new Map(prev.map((r) => [r.slug, r]));
  const alive = prev.filter((r) => !r.gone_at);
  const baseline = prev.length === 0;

  /* A glitch upstream that answers an empty or half-empty list would
     otherwise read as a mass expiry. Refuse it and let the next check retry. */
  if (alive.length >= 10 && current.length < alive.length / 2) {
    return {
      rows: [],
      events: [],
      refused: `App list shrank from ${alive.length} to ${current.length} in one check`,
    };
  }

  const knownCompanies = new Set(prev.filter((r) => !r.is_temp && r.company).map((r) => r.company as string));
  const rows: AppRow[] = [];
  const events: MonitorEvent[] = [];
  const seen = new Set<string>();

  const event = (kind: EventKind, row: AppRow, detail: string | null = null) =>
    events.push({ at: nowIso, kind, app_slug: row.slug, is_temp: row.is_temp, source: sourceOf(row), detail });

  for (const app of current) {
    if (!app?.appSlug || seen.has(app.appSlug)) continue;
    seen.add(app.appSlug);

    const isTemp = app.companyName === TEMP_COMPANY ? 1 : 0;
    const count = Math.max(0, Number(app.deploymentCount ?? 0) || 0);
    const old = prevBySlug.get(app.appSlug);
    const reborn = !!old?.gone_at; // a slug reused after the old app left

    const row: AppRow = {
      slug: app.appSlug,
      company: app.companyName ?? null,
      is_temp: isTemp,
      was_temp: isTemp || (old && !reborn ? old.was_temp : 0) ? 1 : 0,
      created_at: app.createdAt ?? old?.created_at ?? null,
      status: app.status ?? null,
      deploy_count: count,
      last_source: app.lastDeploySource ?? null,
      last_agent: app.lastDeployAgentName ?? null,
      first_seen_at: old && !reborn ? old.first_seen_at : nowIso,
      last_seen_at: nowIso,
      claimed_at: old && !reborn ? old.claimed_at : null,
      gone_at: null,
    };

    if (!old || reborn) {
      if (!baseline) {
        event("app_created", row);
        if (count > 0) for (let i = 0; i < count; i++) event("deploy", row);
        if (row.status === "failed") event("deploy_failed", row);
        if (!isTemp && row.company && !knownCompanies.has(row.company)) event("workspace_first_app", row);
      }
    } else {
      const added = Math.max(0, count - old.deploy_count);
      for (let i = 0; i < added; i++) event("deploy", row);
      if (row.status === "failed" && (old.status !== "failed" || added > 0)) event("deploy_failed", row);
      if (old.is_temp && !isTemp) {
        row.claimed_at = nowIso;
        event("temp_claimed", row);
        if (row.company && !knownCompanies.has(row.company)) event("workspace_first_app", row);
      }
    }
    if (!isTemp && row.company) knownCompanies.add(row.company);
    rows.push(row);
  }

  // Apps that were there last time and are not now.
  for (const old of alive) {
    if (seen.has(old.slug)) continue;
    const gone: AppRow = { ...old, gone_at: nowIso };
    if (old.is_temp) {
      const created = old.created_at ? Date.parse(old.created_at) : NaN;
      const due = created + opts.tempTtlHours * 3600_000;
      // An hour of slack: cleanup runs hourly upstream.
      const early = Number.isFinite(due) && Date.parse(nowIso) < due - 3600_000;
      events.push({ at: nowIso, kind: "temp_expired", app_slug: old.slug, is_temp: 1, source: "no login", detail: early ? "early" : "on_time" });
    } else {
      events.push({ at: nowIso, kind: "app_deleted", app_slug: old.slug, is_temp: 0, source: sourceOf(old), detail: null });
    }
    rows.push(gone);
  }

  return { rows, events, refused: null };
}
