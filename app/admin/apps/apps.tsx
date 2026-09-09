'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { formatDate } from '../../lib/format';

/* Every app on the platform, across all companies. GET /admin/apps answers a
 * flat, unsorted list with no pagination, so the ordering below is ours. */
interface AdminApp {
  appSlug: string;
  // "Unclaimed (orphan)" for an anonymous deploy nobody has claimed.
  companyName: string;
  createdAt: string;
  memoryMb: number;
  deploymentCount: number;
  status: 'success' | 'failed' | 'in_progress' | 'no_deployments' | string;
}

// Reads off the most recent deployment, so "no_deployments" is a real state and
// not a missing value — the app exists but has never shipped.
const STATUS: Record<string, { label: string; className: string }> = {
  success: { label: 'Live', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  in_progress: { label: 'Deploying', className: 'bg-blue-100 text-blue-800' },
  no_deployments: { label: 'Never deployed', className: 'bg-gray-100 text-gray-600' },
};

export default function Apps() {
  const [apps, setApps] = useState<AdminApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hns/admin/apps');
      if (!res.ok) {
        // Admin-only routes deny with a plain 404, not a 403, so a bare
        // "not found" here would point at the wrong problem.
        setError(
          res.status === 404
            ? 'This account can’t list apps, or the endpoint isn’t available yet.'
            : `Couldn’t load apps (${res.status}).`,
        );
        setApps([]);
        return;
      }
      const data = await res.json();
      const rows: AdminApp[] = Array.isArray(data) ? data : (data?.items ?? []);
      // Newest first — the API doesn't order these.
      setApps(
        [...rows].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '')),
      );
      setError(null);
    } catch {
      setError('Network error');
      setApps([]);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">All Apps</h1>
          <p className="text-gray-600 mb-8">
            Every app deployed on the platform, across all companies.
            {apps && apps.length > 0 && ` ${apps.length} total.`}
          </p>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {apps === null ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : apps.length === 0 && !error ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-600">No apps on the platform yet</p>
            </div>
          ) : apps.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">App</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Company</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Deploys</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Memory</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {apps.map((a) => {
                      const status = STATUS[a.status] ?? {
                        label: a.status ?? '—',
                        className: 'bg-gray-100 text-gray-600',
                      };
                      return (
                        <tr key={a.appSlug} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm text-gray-900">{a.appSlug}</span>
                            <a
                              href={`https://${a.appSlug}.app.embarko.ai`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs text-blue-600 hover:underline"
                            >
                              open
                            </a>
                          </td>
                          <td className="px-6 py-4 text-gray-700 text-sm">{a.companyName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`rounded px-2 py-1 text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600 text-sm">{a.deploymentCount}</td>
                          <td className="px-6 py-4 text-right text-gray-600 text-sm whitespace-nowrap">
                            {a.memoryMb != null ? `${a.memoryMb} MB` : '—'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                            {formatDate(a.createdAt ?? null)}
                          </td>
                        </tr>
                      );
                    })}
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
