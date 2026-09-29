'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { formatDate } from '../../lib/format';
import { appUrl } from '../../lib/site';

/* Every app on the platform, across all companies. GET /admin/apps answers a
 * flat, unsorted list with no pagination, so the ordering below is ours. */
interface AdminApp {
  appSlug: string;
  // "Unclaimed (orphan)" for an anonymous deploy nobody has claimed.
  companyName: string;
  createdAt: string;
  memoryMb: number;
  deploymentCount: number;
  /** Who made the latest deploy — "dashboard" | "agent", or null. */
  lastDeploySource: 'dashboard' | 'agent' | null;
  lastDeployAgentName: string | null;
  status: 'success' | 'failed' | 'in_progress' | 'no_deployments' | string;
}

// Reads off the most recent deployment, so "no_deployments" is a real state and
// not a missing value — the app exists but has never shipped.
const STATUS: Record<string, { label: string; className: string }> = {
  success: { label: 'Live', className: 'bg-[var(--ok-soft)] text-success' },
  failed: { label: 'Failed', className: 'bg-[var(--danger-soft)] text-destructive' },
  in_progress: { label: 'Deploying', className: 'bg-elevated text-foreground' },
  no_deployments: { label: 'Never deployed', className: 'bg-elevated text-muted-foreground' },
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
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">All Apps</h1>
          <p className="text-muted-foreground mb-8">
            Every app deployed on the platform, across all companies.
            {apps && apps.length > 0 && ` ${apps.length} total.`}
          </p>

          {error && (
            <div className="mb-8 p-4 bg-[var(--danger-soft)] border border-destructive/30 rounded-lg">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {apps === null ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : apps.length === 0 && !error ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <p className="text-muted-foreground">No apps on the platform yet</p>
            </div>
          ) : apps.length > 0 ? (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-elevated border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">App</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Company</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Last deployed by</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Deploys</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Memory</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {apps.map((a) => {
                      const status = STATUS[a.status] ?? {
                        label: a.status ?? '—',
                        className: 'bg-elevated text-muted-foreground',
                      };
                      return (
                        <tr key={a.appSlug} className="hover:bg-elevated">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm text-foreground">{a.appSlug}</span>
                            <a
                              href={appUrl(a.appSlug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs text-primary hover:underline"
                            >
                              open
                            </a>
                          </td>
                          <td className="px-6 py-4 text-foreground text-sm">{a.companyName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`rounded px-2 py-1 text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-sm">
                            {a.lastDeploySource === 'dashboard'
                              ? 'Dashboard'
                              : a.lastDeploySource === 'agent'
                                ? a.lastDeployAgentName ?? 'AI agent'
                                : '—'}
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground text-sm">{a.deploymentCount}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground text-sm whitespace-nowrap">
                            {a.memoryMb != null ? `${a.memoryMb} MB` : '—'}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">
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
