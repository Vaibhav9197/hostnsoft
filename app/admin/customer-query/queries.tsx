'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { formatDate } from '../../lib/format';
import { FEATURES } from '../../lib/features';

/* Customer queries arrive by several routes — the signed-in dashboard, the
 * public form, an agent posting to ship.embarko.ai — and all of them land in
 * the same store. This view reads the store unfiltered and lets you narrow it
 * here instead, so a route the API starts serving tomorrow shows up on its own
 * rather than waiting for a new page to be built for it.
 *
 * Fields stay optional: the endpoint answers 404 to non-admins, so this shape
 * comes from the API docs rather than a verified response, and rendering "—"
 * beats the page dying on a field named something else. */
export interface CustomerQuery {
  id?: string | number;
  type?: string;
  message?: string;
  /* Deliberately a bare string. Pinning this to a union is what previously
     hid agent submissions from the admin entirely. */
  source?: string;
  email?: string;
  userId?: string | number;
  companyId?: string | number;
  projectSlug?: string;
  agentName?: string;
  createdAt?: string;
}

/** Stands in for a row the API sent without a source, so it stays filterable. */
const UNKNOWN_SOURCE = 'unknown';

function sourceOf(q: CustomerQuery): string {
  const s = q.source?.trim();
  return s ? s : UNKNOWN_SOURCE;
}

/** Titles a source for display without knowing what sources exist. */
function sourceLabel(source: string): string {
  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Documented as { items, page, limit, total, totalPages }, newest first. Only
// the first page is read for now — `total` in the header says when that starts
// to matter.
function toRows(payload: unknown): { rows: CustomerQuery[]; total: number | null } {
  if (Array.isArray(payload)) return { rows: payload as CustomerQuery[], total: null };
  const items = (payload as { items?: CustomerQuery[] })?.items;
  const total = (payload as { total?: number })?.total;
  return { rows: Array.isArray(items) ? items : [], total: typeof total === 'number' ? total : null };
}

export default function Queries() {
  const [rows, setRows] = useState<CustomerQuery[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  /* Index into `visible`, not an id: these rows are allowed to arrive without
     one (the table already falls back to the index as a key). */
  const [selected, setSelected] = useState<number | null>(null);

  /* query id → labels of the features upvoted alongside that message. Votes
     live in their own table and carry the id of the message sent with them;
     votes cast without a message only show on the Feature Votes page. A
     failed read only blanks the column; the queries still load. */
  const [votesBy, setVotesBy] = useState<Map<string, string[]>>(new Map());

  const loadVotes = useCallback(async () => {
    try {
      const res = await fetch('/api/feature-votes/summary');
      if (!res.ok) return;
      const data = (await res.json()) as { votes?: { feature_id: string; query_id: string | null }[] };
      const label = (id: string) => FEATURES.find((f) => f.id === id)?.label ?? id;
      const map = new Map<string, string[]>();
      for (const v of data.votes ?? []) {
        if (!v.query_id) continue;
        map.set(v.query_id, [...(map.get(v.query_id) ?? []), label(v.feature_id)]);
      }
      for (const list of map.values()) list.sort((a, b) => a.localeCompare(b));
      setVotesBy(map);
    } catch {
      // Leave the column as it was.
    }
  }, []);

  const votesOf = (q: CustomerQuery) => (q.id != null ? votesBy.get(String(q.id))?.join(', ') : undefined);

  const load = useCallback(async () => {
    loadVotes();
    try {
      // No `source` param: take whatever the store holds, whatever it's
      // tagged with.
      const res = await fetch('/api/hns/admin/customer-query');
      if (!res.ok) {
        // The API returns a plain 404 to non-admins rather than a 403, so say
        // what that most likely means instead of "not found".
        setError(
          res.status === 404
            ? 'This account can’t read customer queries, or the endpoint isn’t available yet.'
            : `Couldn’t load queries (${res.status}).`,
        );
        setRows([]);
        return;
      }
      const { rows: next, total: count } = toRows(await res.json());
      setRows(next);
      setTotal(count);
      setError(null);
    } catch {
      setError('Network error');
      setRows([]);
    }
  }, [loadVotes]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  /* The filter options are the sources actually present in the response —
     never a list maintained here. */
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of rows ?? []) {
      const s = sourceOf(q);
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);

  /* A source can disappear between polls (the first page moves on). Dropping
     the filter beats showing an empty table with no way to tell why. */
  useEffect(() => {
    if (active && !counts.some(([s]) => s === active)) setActive(null);
  }, [counts, active]);

  const visible = useMemo(
    () => (active ? (rows ?? []).filter((q) => sourceOf(q) === active) : (rows ?? [])),
    [rows, active],
  );

  // Changing the filter reshuffles `visible`, so a held index would point at a
  // different query than the one that was opened.
  useEffect(() => {
    setSelected(null);
  }, [active]);

  const detail = selected != null ? (visible[selected] ?? null) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Customer Queries</h1>
          <p className="text-muted-foreground mb-6">
            Every query in the store, whichever route it came in by — the console, the public form,
            or an agent.
            {/* The endpoint pages at 25 by default; say so rather than
                implying the table is everything. */}
            {total !== null && rows !== null && total > rows.length
              ? ` Showing ${rows.length} of ${total}.`
              : total !== null
                ? ` ${total} total.`
                : ''}
          </p>

          {counts.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <FilterChip
                label="All"
                count={rows?.length ?? 0}
                selected={active === null}
                onClick={() => setActive(null)}
              />
              {counts.map(([source, count]) => (
                <FilterChip
                  key={source}
                  label={sourceLabel(source)}
                  count={count}
                  selected={active === source}
                  onClick={() => setActive(source)}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-[var(--danger-soft)] border border-destructive/30 rounded-lg">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {rows === null ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : visible.length === 0 && !error ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <p className="text-muted-foreground">
                {active ? `No queries from ${sourceLabel(active)} yet` : 'No customer queries yet'}
              </p>
            </div>
          ) : visible.length > 0 ? (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-elevated border-b">
                    <tr>
                      {['Source', 'Type', 'Message', 'Feature votes', 'From', 'Workspace', 'Project', 'Agent', 'When'].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-left text-sm font-semibold text-foreground whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visible.map((q, i) => (
                      <tr
                        key={q.id ?? i}
                        className="cursor-pointer hover:bg-elevated"
                        onClick={() => setSelected(i)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded bg-elevated px-2 py-1 text-xs font-medium text-foreground">
                            {sourceLabel(sourceOf(q))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded bg-elevated px-2 py-1 text-xs font-medium text-foreground">
                            {q.type ?? '—'}
                          </span>
                        </td>
                        {/* One line, clipped. These messages run to full bug
                            reports; letting them wrap made a single row a
                            screenful and buried every other column. The whole
                            text is a click away in the sheet. max-w with a
                            fixed width is what actually makes truncate work
                            inside a table cell — without it the cell just grows
                            to fit and nothing is ever clipped. */}
                        <td className="max-w-md px-6 py-4">
                          <p className="truncate text-foreground">{q.message ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{votesOf(q) ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">{q.email ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">{q.companyId ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm break-all">{q.projectSlug ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm break-all">{q.agentName ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">
                          {formatDate(q.createdAt ?? null)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Detail opens beside the table rather than expanding the row: no
          backdrop and not modal, so the list stays readable and clicking
          another row swaps the contents instead of closing first. */}
      <Sheet modal={false} open={detail !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent
          showOverlay={false}
          onInteractOutside={(e) => e.preventDefault()}
          className="gap-0 shadow-2xl sm:max-w-xl"
        >
          {detail && (
            <>
              <SheetHeader className="shrink-0 p-5 pb-3">
                <SheetTitle>{sourceLabel(sourceOf(detail))} query</SheetTitle>
                <SheetDescription>{formatDate(detail.createdAt ?? null)}</SheetDescription>
              </SheetHeader>

              <div className="shrink-0 grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-4">
                {([
                  ['Type', detail.type],
                  ['Feature votes', votesOf(detail)],
                  ['From', detail.email],
                  ['Company', detail.companyId],
                  ['Project', detail.projectSlug],
                  ['Agent', detail.agentName],
                  ['User', detail.userId],
                ] as const).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <div className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">{k}</div>
                    <div className="mt-1 break-words text-[0.9rem] text-foreground">{v ?? '—'}</div>
                  </div>
                ))}
              </div>

              {/* The message is why the sheet exists, so it gets the remaining
                  height and its own scroll rather than pushing the facts off. */}
              <div className="flex min-h-0 flex-1 flex-col border-t border-border px-5 py-4">
                <div className="mb-2 shrink-0 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">
                  Message
                </div>
                <p className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words text-[0.9rem] leading-relaxed text-foreground">
                  {detail.message ?? '—'}
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-card text-foreground hover:bg-elevated'
      }`}
    >
      {label}
      <span className={selected ? 'ml-2 text-primary-foreground/70' : 'ml-2 text-muted-foreground'}>{count}</span>
    </button>
  );
}
