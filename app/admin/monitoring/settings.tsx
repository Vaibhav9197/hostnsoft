'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { relativeTime } from '../../lib/format';
import { WEEKDAYS, type Level, type MonitorSettings, type RuleInfo, type RuleId } from '../../lib/monitor/settings';

/* Every monitoring choice in one place, already filled with defaults, so the
 * monitor works before anyone opens this page. Order follows what people
 * change most: when reports go out and where, then how noisy alerts are, then
 * the rarer technical settings. Nothing saves until "Save changes". */

interface Setup {
  secretSet: boolean;
  tokenSet: boolean;
  lastRun: { at: string; appsOk: boolean; queriesOk: boolean; error: string | null } | null;
  lastHandOff: string | null;
  pending: number;
}

interface Payload {
  settings: MonitorSettings;
  defaults: MonitorSettings;
  rules: RuleInfo[];
  updatedAt: string | null;
  updatedBy: string | null;
  history: { at: string; by: string | null; changes: { path: string; from: unknown; to: unknown }[] }[];
  setup: Setup;
}

const input =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/40';
const smallButton =
  'rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition hover:bg-elevated disabled:opacity-50';

/** Sets a value at a dotted path on a copy. */
function setAt<T>(obj: T, path: string, value: unknown): T {
  const copy = structuredClone(obj) as Record<string, unknown>;
  const keys = path.split('.');
  let node: Record<string, unknown> = copy;
  for (const k of keys.slice(0, -1)) node = node[k] as Record<string, unknown>;
  node[keys[keys.length - 1]] = value;
  return copy as T;
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldError({ errors, path }: { errors: Record<string, string>; path: string }) {
  return errors[path] ? <p className="mt-1 text-xs text-destructive">{errors[path]}</p> : null;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function Check({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={ok === null ? 'text-faint' : ok ? 'text-success' : 'text-destructive'} aria-hidden>
        {ok === null ? '○' : ok ? '✓' : '✗'}
      </span>
      <span className="text-foreground">{children}</span>
    </li>
  );
}

export default function MonitoringSettings() {
  const [data, setData] = useState<Payload | null>(null);
  const [form, setForm] = useState<MonitorSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ kind: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/settings', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setLoadError(body?.error ?? `Couldn’t load settings (${res.status}).`);
        return;
      }
      setData(body);
      setForm(body.settings);
      setLoadError(null);
    } catch {
      setLoadError('Network error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => !!data && !!form && JSON.stringify(data.settings) !== JSON.stringify(form), [data, form]);

  const set = (path: string, value: unknown) => {
    setForm((f) => (f ? setAt(f, path, value) : f));
    setNotice(null);
  };

  async function save(next = form) {
    if (!next) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/monitor/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: next }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(body?.errors ?? {});
        setNotice(body?.error ?? `Couldn’t save (${res.status}).`);
        return;
      }
      setErrors({});
      setNotice(body.changed ? `Saved ${body.changed} change${body.changed > 1 ? 's' : ''}.` : 'Nothing changed.');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function action(name: 'preview-daily' | 'preview-weekly' | 'test' | 'run') {
    setBusy(name);
    setNotice(null);
    try {
      if (name === 'test') {
        const res = await fetch('/api/monitor/test', { method: 'POST' });
        const body = await res.json().catch(() => null);
        setNotice(res.ok ? `Test queued for ${body.queued} channel${body.queued > 1 ? 's' : ''}. It posts on the scheduler’s next check (within 5 minutes).` : body?.error ?? 'Couldn’t queue the test.');
      } else if (name === 'run') {
        const res = await fetch('/api/monitor/tick', { method: 'POST' });
        const body = await res.json().catch(() => null);
        setNotice(
          res.ok
            ? `Check done. App data: ${body.apps.ok ? 'read' : `failed (${body.apps.error})`}. Queries: ${body.queries.ok ? 'read' : `failed (${body.queries.error})`}. ${body.alerts.firing} alert${body.alerts.firing === 1 ? '' : 's'} firing.`
            : body?.error ?? 'Check failed.',
        );
        await load();
      } else {
        const kind = name === 'preview-daily' ? 'daily' : 'weekly';
        const res = await fetch('/api/monitor/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind }),
        });
        const body = await res.json().catch(() => null);
        if (res.ok) setPreview(body);
        else setNotice(body?.error ?? 'Couldn’t build the preview.');
      }
    } finally {
      setBusy(null);
    }
  }

  const setup = data?.setup;
  const schedulerOk = setup?.lastHandOff ? Date.now() - Date.parse(setup.lastHandOff) < 15 * 60_000 : null;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8 pb-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-4xl font-bold">Monitoring</h1>
          <p className="mb-8 text-muted-foreground">
            When reports go out, where alerts land and how loud they are. Everything starts on sensible defaults. See the results on{' '}
            <Link href="/admin/health" className="text-primary hover:underline">
              Health
            </Link>
            .
          </p>

          {loadError && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-[var(--danger-soft)] p-4">
              <p className="text-destructive">{loadError}</p>
            </div>
          )}
          {!data && !loadError && <p className="py-12 text-center text-muted-foreground">Loading…</p>}

          {data && form && setup && (
            <>
              <Card title="Is it working?">
                <ul className="space-y-2">
                  <Check ok={schedulerOk}>
                    Scheduler{' '}
                    {setup.lastHandOff
                      ? `last picked up messages ${relativeTime(setup.lastHandOff)}`
                      : 'has never called in. Set up the viaSocket flow (docs/MONITORING.md).'}
                    {setup.pending > 0 && ` · ${setup.pending} message${setup.pending > 1 ? 's' : ''} waiting`}
                  </Check>
                  <Check ok={setup.secretSet}>Scheduler secret (MONITOR_SECRET) {setup.secretSet ? 'is set' : 'is not set'}</Check>
                  <Check ok={setup.tokenSet}>App-data sign-in (MONITOR_PROXY_TOKEN) {setup.tokenSet ? 'is set' : 'is not set'}</Check>
                  <Check ok={setup.lastRun ? setup.lastRun.appsOk && setup.lastRun.queriesOk : null}>
                    {setup.lastRun
                      ? `Last check ${relativeTime(setup.lastRun.at)}${setup.lastRun.error ? `: ${setup.lastRun.error}` : ', all data read'}`
                      : 'No check has run yet'}
                  </Check>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className={smallButton} onClick={() => action('run')} disabled={!!busy}>
                    {busy === 'run' ? 'Checking…' : 'Run checks now'}
                  </button>
                  <button className={smallButton} onClick={() => action('test')} disabled={!!busy}>
                    {busy === 'test' ? 'Queuing…' : 'Send test message'}
                  </button>
                </div>
              </Card>

              <Card title="Reports" hint="A short summary in Slack. The daily one covers the last 24 hours; the weekly one compares with the week before.">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Toggle checked={form.reports.daily.enabled} onChange={(v) => set('reports.daily.enabled', v)} label="Daily report at" />
                    <input type="time" className={input} value={form.reports.daily.time} onChange={(e) => set('reports.daily.time', e.target.value)} aria-label="Daily report time" />
                    <button className={smallButton} onClick={() => action('preview-daily')} disabled={!!busy}>
                      Preview
                    </button>
                  </div>
                  <FieldError errors={errors} path="reports.daily.time" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Toggle checked={form.reports.weekly.enabled} onChange={(v) => set('reports.weekly.enabled', v)} label="Weekly report every" />
                    <select className={input} value={form.reports.weekly.day} onChange={(e) => set('reports.weekly.day', Number(e.target.value))} aria-label="Weekly report day">
                      {WEEKDAYS.map((d, i) => (
                        <option key={d} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground">at</span>
                    <input type="time" className={input} value={form.reports.weekly.time} onChange={(e) => set('reports.weekly.time', e.target.value)} aria-label="Weekly report time" />
                    <button className={smallButton} onClick={() => action('preview-weekly')} disabled={!!busy}>
                      Preview
                    </button>
                  </div>
                  <FieldError errors={errors} path="reports.weekly.time" />
                  <div>
                    <label className="text-sm text-muted-foreground" htmlFor="tz">
                      Time zone
                    </label>
                    <input id="tz" className={`${input} ml-3 w-56`} value={form.timezone} onChange={(e) => set('timezone', e.target.value.trim())} />
                    <FieldError errors={errors} path="timezone" />
                  </div>
                  {preview && (
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Preview: {preview.kind} report, saved settings, data as of now</p>
                        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setPreview(null)}>
                          Close
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{preview.text}</pre>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Where to send" hint="Slack channel names (like #embarko-alerts) or ids. Leave one empty to use the scheduler’s default channel.">
                <div className="grid gap-4 md:grid-cols-3">
                  {(['critical', 'warning', 'reports'] as const).map((k) => (
                    <div key={k}>
                      <label className="text-sm text-muted-foreground" htmlFor={`ch-${k}`}>
                        {k === 'critical' ? 'Critical alerts' : k === 'warning' ? 'Warnings' : 'Daily and weekly reports'}
                      </label>
                      <input id={`ch-${k}`} className={`${input} mt-1 w-full`} placeholder="#embarko-alerts" value={form.channels[k]} onChange={(e) => set(`channels.${k}`, e.target.value.trim())} />
                      <FieldError errors={errors} path={`channels.${k}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Toggle checked={form.quietHours.enabled} onChange={(v) => set('quietHours.enabled', v)} label="Hold warnings between" />
                  <input type="time" className={input} value={form.quietHours.start} onChange={(e) => set('quietHours.start', e.target.value)} aria-label="Quiet hours start" />
                  <span className="text-sm text-muted-foreground">and</span>
                  <input type="time" className={input} value={form.quietHours.end} onChange={(e) => set('quietHours.end', e.target.value)} aria-label="Quiet hours end" />
                  <span className="text-sm text-muted-foreground">Critical alerts always go out.</span>
                </div>
              </Card>

              <Card title="Alerts" hint="Critical alerts go out at once; warnings wait for quiet hours to end; info only appears in the daily report. An alert repeats only when it gets worse or after its repeat time, and says when it’s resolved.">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-faint">
                        <th className="py-2 pr-3 font-medium">Alert</th>
                        <th className="py-2 pr-3 font-medium">Level</th>
                        <th className="py-2 pr-3 font-medium">Trips at</th>
                        <th className="py-2 pr-3 font-medium">Only when</th>
                        <th className="py-2 pr-3 font-medium">Repeat after (h)</th>
                        <th className="py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.rules.map((info) => {
                        const r = form.rules[info.id as RuleId];
                        const p = `rules.${info.id}`;
                        const isDefault = JSON.stringify(r) === JSON.stringify(data.defaults.rules[info.id as RuleId]);
                        return (
                          <tr key={info.id} className={r.enabled ? '' : 'opacity-60'}>
                            <td className="py-3 pr-3 align-top">
                              <Toggle checked={r.enabled} onChange={(v) => set(`${p}.enabled`, v)} label={info.name} />
                              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                {info.description}
                                {info.trend && ' Info only during warm-up.'}
                              </p>
                            </td>
                            <td className="py-3 pr-3 align-top">
                              <select className={input} value={r.level} onChange={(e) => set(`${p}.level`, e.target.value as Level)} aria-label={`${info.name} level`}>
                                <option value="critical">Critical</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                              </select>
                            </td>
                            <td className="py-3 pr-3 align-top">
                              <input type="number" min={1} className={`${input} w-24`} value={r.threshold} onChange={(e) => set(`${p}.threshold`, Number(e.target.value))} aria-label={info.thresholdLabel} />
                              <p className="mt-1 text-xs text-faint">{info.thresholdLabel}</p>
                              <FieldError errors={errors} path={`${p}.threshold`} />
                            </td>
                            <td className="py-3 pr-3 align-top">
                              {info.minVolumeLabel ? (
                                <>
                                  <input type="number" min={0} className={`${input} w-24`} value={r.minVolume} onChange={(e) => set(`${p}.minVolume`, Number(e.target.value))} aria-label={info.minVolumeLabel} />
                                  <p className="mt-1 text-xs text-faint">{info.minVolumeLabel}</p>
                                </>
                              ) : (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="py-3 pr-3 align-top">
                              <input type="number" min={1} className={`${input} w-20`} value={r.repeatHours} onChange={(e) => set(`${p}.repeatHours`, Number(e.target.value))} aria-label={`${info.name} repeat hours`} />
                              <FieldError errors={errors} path={`${p}.repeatHours`} />
                            </td>
                            <td className="py-3 align-top">
                              {!isDefault && (
                                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => set(p, structuredClone(data.defaults.rules[info.id as RuleId]))}>
                                  Reset
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <label htmlFor="warmup" className="text-muted-foreground">
                    Trend alerts learn what’s usual for
                  </label>
                  <input id="warmup" type="number" min={0} className={`${input} w-20`} value={form.warmupDays} onChange={(e) => set('warmupDays', Number(e.target.value))} />
                  <span className="text-muted-foreground">days before they can warn.</span>
                  <FieldError errors={errors} path="warmupDays" />
                </div>
              </Card>

              <Card title="Health checks" hint="Each address is opened on every check. Anything but a 2xx answer, or no answer in time, counts as a failure.">
                <ul className="space-y-3">
                  {form.health.targets.map((t, i) => (
                    <li key={i} className="flex flex-wrap items-start gap-3">
                      <div>
                        <input className={`${input} w-44`} value={t.name} onChange={(e) => set(`health.targets.${i}.name`, e.target.value)} aria-label="Check name" />
                        <FieldError errors={errors} path={`health.targets.${i}.name`} />
                      </div>
                      <div className="min-w-64 flex-1">
                        <input className={`${input} w-full`} value={t.url} onChange={(e) => set(`health.targets.${i}.url`, e.target.value.trim())} aria-label="Check address" />
                        <FieldError errors={errors} path={`health.targets.${i}.url`} />
                        <FieldError errors={errors} path={`health.targets.${i}.id`} />
                      </div>
                      <button
                        className="py-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => set('health.targets', form.health.targets.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                {form.health.targets.length < 10 && (
                  <button
                    className={`${smallButton} mt-3`}
                    onClick={() =>
                      set('health.targets', [...form.health.targets, { id: `check-${Date.now().toString(36)}`, name: '', url: 'https://' }])
                    }
                  >
                    Add a check
                  </button>
                )}
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <label htmlFor="timeout" className="text-muted-foreground">
                    Wait up to
                  </label>
                  <input id="timeout" type="number" min={1} max={20} className={`${input} w-20`} value={form.health.timeoutMs / 1000} onChange={(e) => set('health.timeoutMs', Math.round(Number(e.target.value) * 1000))} />
                  <span className="text-muted-foreground">seconds for an answer.</span>
                  <FieldError errors={errors} path="health.timeoutMs" />
                </div>
              </Card>

              <Card title="Queries and temporary apps">
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground">A customer query is overdue after</span>
                    <input type="number" min={1} className={`${input} w-20`} value={form.queries.overdueHours} onChange={(e) => set('queries.overdueHours', Number(e.target.value))} aria-label="Overdue hours" />
                    <span className="text-muted-foreground">hours.</span>
                    <FieldError errors={errors} path="queries.overdueHours" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground">Temporary apps last</span>
                    <input type="number" min={1} className={`${input} w-20`} value={form.tempApps.ttlHours} onChange={(e) => set('tempApps.ttlHours', Number(e.target.value))} aria-label="Temporary app lifetime hours" />
                    <span className="text-muted-foreground">hours (match the API’s setting). Alert if one is still online</span>
                    <input type="number" min={0} className={`${input} w-20`} value={form.tempApps.cleanupGraceHours} onChange={(e) => set('tempApps.cleanupGraceHours', Number(e.target.value))} aria-label="Cleanup grace hours" />
                    <span className="text-muted-foreground">hours after that.</span>
                  </div>
                </div>
              </Card>

              {data.history.length > 0 && (
                <Card title="Recent changes">
                  <ul className="space-y-2 text-sm">
                    {data.history.map((h, i) => (
                      <li key={i}>
                        <span className="text-faint">{relativeTime(h.at)}</span> <span className="text-foreground">{h.by ?? 'someone'}</span>{' '}
                        <span className="text-muted-foreground">
                          changed {h.changes.slice(0, 3).map((c) => c.path).join(', ')}
                          {h.changes.length > 3 && ` and ${h.changes.length - 3} more`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-8 py-3 pl-72">
                  <button
                    onClick={() => save()}
                    disabled={!dirty || saving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  {dirty && (
                    <button className={smallButton} onClick={() => { setForm(data.settings); setErrors({}); }}>
                      Discard
                    </button>
                  )}
                  <button
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (window.confirm('Put every monitoring setting back to its default? Channels and health checks are reset too.')) save(data.defaults);
                    }}
                  >
                    Reset all to defaults
                  </button>
                  {notice && <span className="text-sm text-muted-foreground">{notice}</span>}
                  {data.updatedAt && !notice && (
                    <span className="text-xs text-faint">
                      Last saved {relativeTime(data.updatedAt)}
                      {data.updatedBy && ` by ${data.updatedBy}`}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
