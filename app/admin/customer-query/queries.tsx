'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { formatDate } from '../../lib/format';

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

  const load = useCallback(async () => {
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
  }, []);

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Customer Queries</h1>
          <p className="text-gray-600 mb-6">
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
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {rows === null ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : visible.length === 0 && !error ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-600">
                {active ? `No queries from ${sourceLabel(active)} yet` : 'No customer queries yet'}
              </p>
            </div>
          ) : visible.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      {['Source', 'Type', 'Message', 'From', 'Company', 'Project', 'Agent', 'When'].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visible.map((q, i) => (
                      <tr key={q.id ?? i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {sourceLabel(sourceOf(q))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {q.type ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-2xl">
                          <p className="text-gray-700 break-words whitespace-pre-wrap">{q.message ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm break-all">{q.email ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{q.companyId ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm break-all">{q.projectSlug ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm break-all">{q.agentName ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
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
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
      <span className={selected ? 'ml-2 text-blue-100' : 'ml-2 text-gray-500'}>{count}</span>
    </button>
  );
}
