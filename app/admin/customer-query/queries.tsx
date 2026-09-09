'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { formatDate } from '../../lib/format';

/* Customer queries come in by three routes — the signed-in dashboard, the
 * public form, and an agent posting to ship.embarko.ai — and all three land in
 * the same store. GET /admin/customer-query reads it back, filtered by source,
 * which is what splits this view into the two nav entries.
 *
 * Fields stay optional: the endpoint answers 404 to non-admins, so this shape
 * comes from the API docs rather than a verified response, and rendering "—"
 * beats the page dying on a field named something else. */
export interface CustomerQuery {
  id?: string | number;
  type?: 'feature' | 'feedback' | 'other' | string;
  message?: string;
  source?: 'dashboard' | 'public' | 'agent' | string;
  email?: string;
  userId?: string | number;
  companyId?: string | number;
  projectSlug?: string;
  agentName?: string;
  createdAt?: string;
}

// The API also serves an "agent" source (deploy-token submissions from
// ship.embarko.ai), which has no nav entry yet.
export type QuerySource = 'dashboard' | 'public';

const COPY: Record<QuerySource, { title: string; blurb: string; empty: string }> = {
  dashboard: {
    title: 'Dashboard Queries',
    blurb: 'Submitted from inside the console by a signed-in user. The email comes from their verified session.',
    empty: 'No queries from the dashboard yet',
  },
  public: {
    title: 'Public Queries',
    blurb: 'Submitted by anonymous visitors through the public form, which asks for an email address.',
    empty: 'No public queries yet',
  },
};

// Documented as { items, page, limit, total, totalPages }, newest first. Only
// the first page is read for now — `total` in the header says when that starts
// to matter.
function toRows(payload: unknown): { rows: CustomerQuery[]; total: number | null } {
  if (Array.isArray(payload)) return { rows: payload as CustomerQuery[], total: null };
  const items = (payload as { items?: CustomerQuery[] })?.items;
  const total = (payload as { total?: number })?.total;
  return { rows: Array.isArray(items) ? items : [], total: typeof total === 'number' ? total : null };
}

export default function Queries({ source }: { source: QuerySource }) {
  const [rows, setRows] = useState<CustomerQuery[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[source];

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hns/admin/customer-query?source=${source}`);
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
  }, [source]);

  useEffect(() => {
    setRows(null);
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">{copy.title}</h1>
          <p className="text-gray-600 mb-8">
            {copy.blurb}
            {/* The endpoint pages at 25 by default; say so rather than
                implying the table is everything. */}
            {total !== null && rows !== null && total > rows.length
              ? ` Showing ${rows.length} of ${total}.`
              : total !== null
                ? ` ${total} total.`
                : ''}
          </p>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {rows === null ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : rows.length === 0 && !error ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-600">{copy.empty}</p>
            </div>
          ) : rows.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Message</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">From</th>
                      {source === 'dashboard' && (
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Company</th>
                      )}
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((q, i) => (
                      <tr key={q.id ?? i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {q.type ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-2xl">
                          <p className="text-gray-700 break-words whitespace-pre-wrap">{q.message ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm break-all">{q.email ?? '—'}</td>
                        {source === 'dashboard' && (
                          <td className="px-6 py-4 text-gray-600 text-sm">{q.companyId ?? '—'}</td>
                        )}
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
