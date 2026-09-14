'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '../components/AdminNav';

interface Metric {
  variant: string;
  /** Unique people, not page views — every rate below divides by this. */
  visitors: number;
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

const RANGES = ['24h', '7d', '30d', '90d', 'all'] as const;
type Range = (typeof RANGES)[number];

const RANGE_LABEL: Record<Range, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  all: 'All time',
};

/**
 * Format variant name: alpha → Alpha, beta → Beta, etc.
 */
function formatVariant(variant: string): string {
  return variant.charAt(0).toUpperCase() + variant.slice(1);
}

/**
 * Below this many visitors in an arm, a conversion rate is noise. One visitor
 * who converts reads as 100%, and the old dashboard would crown it.
 */
const MIN_VISITORS = 100;

/**
 * 95% confidence interval for a conversion rate (Wilson score).
 *
 * Wilson rather than the textbook normal interval because these rates sit near
 * zero on small samples, exactly where the normal approximation produces
 * nonsense like a negative lower bound.
 */
function interval(successes: number, total: number): [number, number] {
  if (total === 0) return [0, 0];
  const z = 1.96;
  const p = successes / total;
  const d = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return [Math.max(0, (centre - spread) / d) * 100, Math.min(1, (centre + spread) / d) * 100];
}

interface Verdict {
  leader: Metric | null;
  /** True only when the leader's interval clears every rival's entirely. */
  conclusive: boolean;
  /** Why not, when it isn't — shown instead of a false result. */
  reason: string;
}

/**
 * What the numbers actually support.
 *
 * The old version picked the highest percentage and captioned it "CURRENT
 * WINNER", which on one visitor and one conversion declared a winner at 100%.
 * A dashboard that announces a result the data cannot support is worse than
 * one that announces nothing, because someone acts on it.
 */
function readVerdict(metrics: Metric[]): Verdict {
  const withTraffic = metrics.filter((m) => m.visitors > 0);
  if (withTraffic.length === 0) return { leader: null, conclusive: false, reason: 'No traffic recorded yet.' };

  const leader = withTraffic.reduce((best, m) =>
    parseFloat(m.overall_conversion) > parseFloat(best.overall_conversion) ? m : best,
  );

  const short = metrics.filter((m) => m.visitors < MIN_VISITORS);
  if (short.length > 0) {
    const lowest = Math.min(...metrics.map((m) => m.visitors));
    return {
      leader,
      conclusive: false,
      reason: `Too early to call — ${short.length} of ${metrics.length} arms are under ${MIN_VISITORS} visitors (lowest has ${lowest}).`,
    };
  }

  const [leaderLow] = interval(leader.deployments_success, leader.visitors);
  const beaten = withTraffic
    .filter((m) => m.variant !== leader.variant)
    .every((m) => leaderLow > interval(m.deployments_success, m.visitors)[1]);

  return beaten
    ? { leader, conclusive: true, reason: 'Leads every other arm with no overlap at 95% confidence.' }
    : { leader, conclusive: false, reason: 'Leading, but the confidence intervals still overlap — keep running.' };
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('all');
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/metrics?range=${range}`);

        /* Signed out (or not on the ADMIN_EMAILS allowlist). Stop the poll
           rather than reissuing a request that can only fail every 5s. */
        if (res.status === 401) {
          if (interval) clearInterval(interval);
          setDenied(true);
          return;
        }

        const data = await res.json();
        // A missing array here means an error envelope, not metrics.
        if (!Array.isArray(data?.metrics)) return;

        setMetrics(data.metrics);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    interval = setInterval(fetchMetrics, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, [range]);

  const verdict = readVerdict(metrics);

  if (loading) return <div className="p-8">Loading...</div>;

  if (denied) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-muted-foreground">
            This dashboard shows internal performance data. Sign in with an account that has
            access to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">AB Test Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Landing page variant performance. Every figure counts unique visitors, not events.
          </p>

          <div className="mb-8 flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  range === r ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-elevated'
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          {verdict.leader && (
            <div
              className={`mb-8 rounded-lg border-2 p-6 ${
                verdict.conclusive ? 'border-success/30 bg-[var(--ok-soft)]' : 'border-border bg-card'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  verdict.conclusive ? 'text-success' : 'text-muted-foreground'
                }`}
              >
                {verdict.conclusive ? '🏆 WINNER' : 'LEADING SO FAR'}
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  verdict.conclusive ? 'text-success' : 'text-foreground'
                }`}
              >
                {formatVariant(verdict.leader.variant)}
              </p>
              <p className={`mt-1 ${verdict.conclusive ? 'text-success' : 'text-muted-foreground'}`}>
                {verdict.leader.overall_conversion}% overall conversion ·{' '}
                {verdict.leader.visitors.toLocaleString()} visitors
              </p>
              {/* The caveat is the point, not a footnote: this banner is the
                  only thing most people will read. */}
              <p className="mt-2 text-sm text-muted-foreground">{verdict.reason}</p>
            </div>
          )}

        {/* Metrics Table */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-elevated border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Variant</th>
                <th className="px-6 py-4 text-center font-semibold">Visitors</th>
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
                    verdict.conclusive && m.variant === verdict.leader?.variant
                      ? 'bg-[var(--ok-soft)]'
                      : 'hover:bg-elevated'
                  }`}
                >
                  <td className="px-6 py-4 font-bold text-lg">{formatVariant(m.variant)}</td>
                  <td className="px-6 py-4 text-center">{m.visitors.toLocaleString()}</td>
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
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-semibold text-foreground mb-4">Copy Clicks by Variant</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold">{m.cta_copy}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-semibold text-foreground mb-4">Login Clicks by Variant</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold">{m.cta_login}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-semibold text-foreground mb-4">Signup Clicks by Variant</h3>
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
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-semibold text-foreground mb-4">Successful Deployments</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold text-success">{m.deployments_success}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-semibold text-foreground mb-4">Failed Deployments</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.variant} className="flex justify-between">
                  <span>{formatVariant(m.variant)}</span>
                  <span className="font-bold text-destructive">{m.deployments_failed}</span>
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
