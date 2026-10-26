'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { relativeTime, untilTime } from '../../lib/format';
import type { AlertState } from '../../lib/monitor/alerts';
import type { Summary } from '../../lib/monitor/metrics';
import { appUrl } from '../../lib/site';

/* Health: is Embarko healthy, is it growing, and what needs a person.
 *
 * Ordered by what needs attention first: open alerts, then the numbers for
 * the period next to the period before, then the two queues a person works
 * through (customer queries, temporary apps). Every number comes from
 * /api/monitor/health, which uses the same summarize() as the Slack reports. */

interface HealthData {
  range: Range;
  cur: Summary;
  prev: Summary;
  alerts: AlertState[];
  tempApps: { slug: string; createdAt: string | null; expiresAt: string | null }[];
  queries: {
    id: string;
    created_at: string;
    type: string | null;
    source: string | null;
    email: string | null;
    project_slug: string | null;
    agent_name: string | null;
    message: string | null;
  }[];
  events: { at: string; kind: string; app_slug: string | null; is_temp: number; source: string | null; detail: string | null }[];
  overdueHours: number;
  lastRun: { at: string; appsOk: boolean; queriesOk: boolean; error: string | null } | null;
}

const RANGES = ['24h', '7d', '30d'] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABEL: Record<Range, string> = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };

const LEVEL: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-[var(--danger-soft)] text-destructive' },
  warning: { label: 'Warning', className: 'bg-[var(--warn-soft)] text-[var(--warn)]' },
  info: { label: 'Info', className: 'bg-elevated text-muted-foreground' },
};

const EVENT_WORDS: Record<string, string> = {
  app_created: 'New app',
  deploy: 'Deployed',
  deploy_failed: 'Deploy failed',
  temp_claimed: 'Temporary app kept',
  temp_expired: 'Temporary app expired',
  app_deleted: 'App deleted',
  workspace_first_app: 'New workspace',
};

/** "▲ 20%" against the period before; null when there's nothing to compare with. */
function change(now: number | null, before: number | null): { text: string; up: boolean | null } | null {
  if (now === null || before === null) return null;
  if (before === 0) return now === 0 ? { text: 'same', up: null } : { text: 'new', up: true };
  const d = Math.round(((now - before) / before) * 100);
  if (d === 0) return { text: 'same', up: null };
  return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%`, up: d > 0 };
}

function Stat({
  label,
  value,
  before,
  suffix = '',
  goodWhenUp = true,
  noData = false,
}: {
  label: string;
  value: number | null;
  before?: number | null;
  suffix?: string;
  goodWhenUp?: boolean;
  noData?: boolean;
}) {
  const c = noData ? null : change(value, before ?? null);
  const tone =
    c?.up == null ? 'text-muted-foreground' : c.up === goodWhenUp ? 'text-success' : 'text-destructive';
  return (
    <div className="py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {noData || value === null ? <span className="text-base font-normal text-faint">no data</span> : `${value.toLocaleString()}${suffix}`}
        </span>
        {c && <span className={`text-xs ${tone}`}>{c.text}</span>}
      </dd>
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function Health() {
  const [range, setRange] = useState<Range>('24h');
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [busyQuery, setBusyQuery] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitor/health?range=${range}`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Couldn’t load Health (${res.status}).`);
        return;
      }
      setData(body);
      setError(null);
    } catch {
      setError('Network error');
    }
  }, [range]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch('/api/monitor/tick', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok) setError(body?.error ?? `Check failed (${res.status}).`);
      await load();
    } finally {
      setRunning(false);
    }
  }

  async function triage(id: string, status: 'resolved' | 'wont_fix') {
    setBusyQuery(id);
    try {
      const res = await fetch(`/api/monitor/queries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) setError(`Couldn’t update the query (${res.status}).`);
      await load();
    } finally {
      setBusyQuery(null);
    }
  }

  const cur = data?.cur;
  const prev = data?.prev;
  const none = cur?.data.state === 'none';
  const loud = data?.alerts.filter((a) => a.level !== 'info') ?? [];
  const quiet = data?.alerts.filter((a) => a.level === 'info') ?? [];
  const overdueBefore = data ? Date.now() - data.overdueHours * 3600_000 : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mb-2 text-4xl font-bold">Health</h1>
              <p className="text-muted-foreground">
                Is Embarko healthy, is it growing, and does anything need you.
                {data?.lastRun && <> Last check {relativeTime(data.lastRun.at)}.</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Period">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    role="tab"
                    aria-selected={range === r}
                    onClick={() => setRange(r)}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
              <button
                onClick={runNow}
                disabled={running}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-elevated disabled:opacity-50"
              >
                {running ? 'Checking…' : 'Run checks now'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-[var(--danger-soft)] p-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {data && !data.lastRun && (
            <div className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
              <p className="font-medium text-foreground">Monitoring hasn’t run yet.</p>
              <p className="mt-1 text-muted-foreground">
                Press <strong>Run checks now</strong> to take a first look, then connect the scheduler in{' '}
                <Link href="/admin/monitoring" className="text-primary hover:underline">
                  Monitoring settings
                </Link>
                .
              </p>
            </div>
          )}

          {data?.lastRun && !data.lastRun.appsOk && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-[var(--danger-soft)] p-4 text-sm">
              <p className="font-medium text-destructive">The last check couldn’t read app data.</p>
              <p className="mt-1 text-muted-foreground">{data.lastRun.error ?? 'Unknown error.'} Numbers below may be stale.</p>
            </div>
          )}

          {!data && !error && <p className="py-12 text-center text-muted-foreground">Loading…</p>}

          {data && cur && prev && (
            <>
              <Section title="Needs you">
                {loud.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm text-success">Nothing needs you right now.</div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {loud.map((a) => (
                      <li key={a.key} className="flex flex-wrap items-start gap-3 p-4">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${LEVEL[a.level]?.className}`}>{LEVEL[a.level]?.label}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{a.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{a.detail}</p>
                        </div>
                        <span className="text-xs text-faint">since {relativeTime(a.first_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {quiet.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {quiet.map((a) => (
                      <li key={a.key}>• {a.title}</li>
                    ))}
                  </ul>
                )}
              </Section>

              {cur.data.state !== 'ok' && (
                <p className="mb-6 text-sm text-muted-foreground">
                  {none
                    ? 'No successful check in this period, so activity shows as no data rather than zero.'
                    : `Only ${cur.data.coverage}% of checks ran in this period, so counts may be low.`}
                </p>
              )}

              <Section title={`Last ${RANGE_LABEL[range]}`} aside={<span className="text-xs text-faint">vs the {RANGE_LABEL[range]} before</span>}>
                <div className="rounded-lg border border-border bg-card px-6 py-2">
                  <h3 className="pt-3 text-xs font-semibold uppercase tracking-wide text-faint">Apps</h3>
                  <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
                    <Stat label="New apps" value={cur.apps.created} before={prev.apps.created} noData={none} />
                    <Stat label="Deploys" value={cur.apps.deploys} before={prev.apps.deploys} noData={none} />
                    <Stat label="Failed deploys" value={cur.apps.failed} before={prev.apps.failed} goodWhenUp={false} noData={none} />
                    <Stat label="Live now" value={cur.live.live} />
                  </dl>
                  <h3 className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-faint">Temporary apps (no login)</h3>
                  <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
                    <Stat label="Created" value={cur.temp.created} before={prev.temp.created} noData={none} />
                    <Stat label="Kept" value={cur.temp.claimed} before={prev.temp.claimed} noData={none} />
                    <Stat label="Expired" value={cur.temp.expired} before={prev.temp.expired} goodWhenUp={false} noData={none} />
                    <Stat label="Kept rate" value={cur.temp.keptRate} before={prev.temp.keptRate} suffix="%" noData={none} />
                  </dl>
                  <h3 className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-faint">Growth</h3>
                  <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
                    <Stat label="New workspaces" value={cur.workspaces.firstApp} before={prev.workspaces.firstApp} noData={none} />
                    <Stat label="Website visitors" value={cur.web?.visitors ?? null} before={prev.web?.visitors ?? null} />
                    <Stat label="Prompt copies" value={cur.web?.promptCopies ?? null} before={prev.web?.promptCopies ?? null} />
                    <div className="py-3">
                      <dt className="text-sm text-muted-foreground">Signups</dt>
                      <dd className="mt-1 text-sm text-faint">Not tracked yet</dd>
                    </div>
                  </dl>
                  <h3 className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-faint">Customer queries and uptime</h3>
                  <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
                    <Stat label="New queries" value={cur.queries.created} before={prev.queries.created} goodWhenUp={false} />
                    <Stat label="Open now" value={cur.queries.openNow} />
                    {cur.health.map((h) => (
                      <Stat key={h.id} label={`${h.name} uptime`} value={h.uptime} suffix="%" />
                    ))}
                  </dl>
                </div>
                {cur.apps.bySource.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Deploys by source:{' '}
                    {cur.apps.bySource.map((s, i) => (
                      <span key={s.source}>
                        {i > 0 && ' · '}
                        {s.source} {s.deploys}
                        {s.failed > 0 && <span className="text-destructive"> ({s.failed} failed)</span>}
                      </span>
                    ))}
                  </p>
                )}
              </Section>

              <Section title="Customer queries to answer" aside={<span className="text-xs text-faint">overdue after {data.overdueHours} h</span>}>
                {data.queries.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No open queries.</div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {data.queries.map((q) => {
                      const overdue = Date.parse(q.created_at) < overdueBefore;
                      return (
                        <li key={q.id} className="flex flex-wrap items-start gap-4 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-faint">
                              {(q.type ?? 'other').replace(/_/g, ' ')} · {q.email ?? q.agent_name ?? q.source ?? 'unknown'}
                              {q.project_slug && ` · ${q.project_slug}`} ·{' '}
                              <span className={overdue ? 'font-medium text-destructive' : ''}>
                                {relativeTime(q.created_at)}
                                {overdue && ' (overdue)'}
                              </span>
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-foreground">{q.message || '—'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => triage(q.id, 'resolved')}
                              disabled={busyQuery === q.id}
                              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                            >
                              Resolved
                            </button>
                            <button
                              onClick={() => triage(q.id, 'wont_fix')}
                              disabled={busyQuery === q.id}
                              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-elevated disabled:opacity-50"
                            >
                              Won’t fix
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              <Section title="Temporary apps online" aside={<span className="text-xs text-faint">{data.tempApps.length} now</span>}>
                {data.tempApps.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No temporary apps online.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-elevated">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">App</th>
                          <th className="px-4 py-2 text-left font-semibold">Created</th>
                          <th className="px-4 py-2 text-left font-semibold">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.tempApps.map((t) => {
                          const late = t.expiresAt && Date.parse(t.expiresAt) < Date.now();
                          return (
                            <tr key={t.slug}>
                              <td className="px-4 py-2">
                                <a href={appUrl(t.slug)} target="_blank" rel="noopener noreferrer" className="font-mono text-foreground hover:underline">
                                  {t.slug}
                                </a>
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">{relativeTime(t.createdAt)}</td>
                              <td className={`px-4 py-2 ${late ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                                {late ? `overdue by ${relativeTime(t.expiresAt).replace(' ago', '')}` : untilTime(t.expiresAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section title="Recent activity">
                {data.events.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                    Nothing recorded yet. The first check only takes a baseline; changes show from the second one.
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {data.events.map((e, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-20 shrink-0 text-faint">{relativeTime(e.at)}</span>
                        <span className={e.kind === 'deploy_failed' ? 'text-destructive' : 'text-foreground'}>
                          {EVENT_WORDS[e.kind] ?? e.kind}
                          {e.detail === 'early' && ' early'}
                        </span>
                        {e.app_slug && <span className="font-mono text-muted-foreground">{e.app_slug}</span>}
                        {e.source && <span className="text-faint">{e.source}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
