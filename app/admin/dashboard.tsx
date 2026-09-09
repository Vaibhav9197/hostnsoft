'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '../components/AdminNav';

interface Metric {
  variant: string;
  page_views: number;
  cta_clicks: number;
  cta_copy: number;
  cta_login: number;
  cta_signup: number;
  deployments_success: number;
  deployments_failed: number;
  signups: number;
  ctr: string;
  conversion_rate: string;
  overall_conversion: string;
}

/**
 * Format variant name: alpha → Alpha, beta → Beta, etc.
 */
function formatVariant(variant: string): string {
  return variant.charAt(0).toUpperCase() + variant.slice(1);
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');

        /* Signed out (or not on the ADMIN_EMAILS allowlist). Stop the poll
           rather than reissuing a request that can only fail every 5s. */
        if (res.status === 401) {
          if (interval) clearInterval(interval);
          setDenied(true);
          return;
        }

        const data = await res.json();
        // A non-array here means an error envelope, not metrics — don't map it.
        if (!Array.isArray(data)) return;

        setMetrics(data);

        // Find winner (highest overall conversion)
        if (data.length > 0) {
          const best = data.reduce((prev: Metric, current: Metric) =>
            parseFloat(current.overall_conversion) > parseFloat(prev.overall_conversion) ? current : prev
          );
          setWinner(best.variant);
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    interval = setInterval(fetchMetrics, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  if (denied) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6">
          <h1 className="text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-gray-600">
            This dashboard shows internal performance data. Sign in with an account that has
            access to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">AB Test Dashboard</h1>
          <p className="text-gray-600 mb-8">Landing page variant performance metrics</p>

        {winner && (
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-700">🏆 CURRENT WINNER</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {formatVariant(winner)}
            </p>
            <p className="text-green-700 mt-1">
              {metrics.find(m => m.variant === winner)?.overall_conversion}% overall conversion rate
            </p>
          </div>
        )}

        {/* Metrics Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Variant</th>
                <th className="px-6 py-4 text-center font-semibold">Views</th>
                <th className="px-6 py-4 text-center font-semibold">CTR</th>
                <th className="px-6 py-4 text-center font-semibold">Clicks</th>
                <th className="px-6 py-4 text-center font-semibold">Deployed</th>
                <th className="px-6 py-4 text-center font-semibold">Conv. Rate</th>
                <th className="px-6 py-4 text-center font-semibold">Overall Conv.</th>
                <th className="px-6 py-4 text-center font-semibold">Signups</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr
                  key={m.variant}
                  className={`border-b ${
                    m.variant === winner ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 font-bold text-lg">{formatVariant(m.variant)}</td>
                  <td className="px-6 py-4 text-center">{m.page_views}</td>
                  <td className="px-6 py-4 text-center">{m.ctr}%</td>
                  <td className="px-6 py-4 text-center">{m.cta_clicks}</td>
                  <td className="px-6 py-4 text-center font-semibold">{m.deployments_success}</td>
                  <td className="px-6 py-4 text-center">{m.conversion_rate}%</td>
                  <td className="px-6 py-4 text-center font-bold text-lg">{m.overall_conversion}%</td>
                  <td className="px-6 py-4 text-center">{m.signups}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA Breakdown */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Copy Clicks by Variant</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold">{m.cta_copy}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Login Clicks by Variant</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold">{m.cta_login}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Signup Clicks by Variant</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold">{m.cta_signup}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deployment Stats */}
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Successful Deployments</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold text-green-600">{m.deployments_success}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Failed Deployments</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold text-red-600">{m.deployments_failed}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
