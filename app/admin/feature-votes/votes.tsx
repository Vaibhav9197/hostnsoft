'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { FEATURES } from '../../lib/features';
import { formatDate } from '../../lib/format';

/* Upvotes from the panel's "What's missing?" box, ranked so the most wanted
   feature is on top. Every upcoming feature is listed, zero votes included —
   "nobody asked for this" is an answer too. Click a row for who voted. */

type Vote = { feature_id: string; email: string; company_id: string | null; created_at: string };

export default function Votes() {
  const [votes, setVotes] = useState<Vote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/feature-votes/summary');
      if (!res.ok) {
        setError(`Couldn’t load votes (${res.status}).`);
        setVotes([]);
        return;
      }
      const data = (await res.json()) as { votes?: Vote[] };
      setVotes(Array.isArray(data.votes) ? data.votes : []);
      setError(null);
    } catch {
      setError('Network error');
      setVotes([]);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const ranked = useMemo(() => {
    const byFeature = new Map<string, Vote[]>();
    for (const v of votes ?? []) byFeature.set(v.feature_id, [...(byFeature.get(v.feature_id) ?? []), v]);
    // Upcoming features first, then anything voted for that has since shipped
    // or been renamed, so no vote silently disappears from the count.
    const known = FEATURES.filter((f) => f.upcoming || byFeature.has(f.id));
    const rows = known.map((f) => ({
      id: f.id,
      label: f.label,
      Icon: f.Icon,
      shipped: !f.upcoming,
      voters: byFeature.get(f.id) ?? [],
    }));
    for (const [id, voters] of byFeature) {
      if (!FEATURES.some((f) => f.id === id)) rows.push({ id, label: id, Icon: FEATURES[0].Icon, shipped: true, voters });
    }
    return rows.sort((a, b) => b.voters.length - a.voters.length || a.label.localeCompare(b.label));
  }, [votes]);

  const totalVotes = votes?.length ?? 0;
  const people = useMemo(() => new Set((votes ?? []).map((v) => v.email)).size, [votes]);
  const top = ranked[0]?.voters.length ?? 0;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Feature Votes</h1>
          <p className="text-muted-foreground mb-8">
            What customers want next, from the upvote picker in the panel’s “What’s missing?” box.
            {votes !== null && !error &&
              ` ${totalVotes} vote${totalVotes === 1 ? '' : 's'} from ${people} ${people === 1 ? 'person' : 'people'}.`}
          </p>

          {error && <div className="mb-6 text-sm font-medium text-destructive">{error}</div>}

          {votes === null ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <ol className="bg-card rounded-lg shadow divide-y divide-border">
              {ranked.map((f, i) => {
                const n = f.voters.length;
                const share = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
                const expanded = open === f.id;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      disabled={n === 0}
                      onClick={() => setOpen(expanded ? null : f.id)}
                      className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-4 px-6 py-4 text-left transition hover:bg-elevated disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className="text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className="grid gap-2">
                        <span className="flex items-center gap-2 font-semibold text-foreground">
                          <f.Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                          {f.label}
                          <span className="font-normal text-muted-foreground">
                            – <span className="font-semibold tabular-nums text-foreground">{n}</span>{' '}
                            {n === 1 ? 'vote' : 'votes'}
                          </span>
                          {f.shipped && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Shipped
                            </span>
                          )}
                        </span>
                        {/* Bars are scaled to the leader, so the gap between
                            first and the rest is what the eye reads. */}
                        <span className="block h-2 rounded-full bg-accent" aria-hidden="true">
                          <span
                            className="block h-2 rounded-full bg-foreground"
                            style={{ width: top ? `${(n / top) * 100}%` : '0%' }}
                          />
                        </span>
                      </span>
                      {/* The count sits by the name; this column is the
                          share of all votes, for comparing features. */}
                      <span className="min-w-[3.5rem] text-right text-xl font-bold tabular-nums text-foreground">
                        {share}%
                      </span>
                    </button>

                    {expanded && (
                      <table className="w-full border-t border-border text-sm">
                        <thead className="bg-elevated">
                          <tr>
                            {['From', 'Workspace', 'When'].map((h) => (
                              <th key={h} className="px-6 py-2 text-left font-semibold text-foreground">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {f.voters.map((v) => (
                            <tr key={v.email}>
                              <td className="px-6 py-2 text-foreground">{v.email}</td>
                              <td className="px-6 py-2 text-muted-foreground">{v.company_id ?? '—'}</td>
                              <td className="px-6 py-2 text-muted-foreground">{formatDate(v.created_at.replace(' ', 'T') + 'Z')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
