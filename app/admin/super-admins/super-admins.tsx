'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { formatDate } from '../../lib/format';

/* Platform administrators — the people who can reach /admin at all.
 *
 * Three upstream endpoints, all reached through the generic authenticated
 * proxy (/api/hns/* forwards to hostnsoft-api with the session PAT attached):
 *
 *   GET    /admin/super-admins               list
 *   POST   /admin/super-admins {email}       grant
 *   DELETE /admin/super-admins/:userId       revoke
 *
 * Both writes hand out or take away total access to every company's data, so
 * each confirms against the address before sending rather than offering an
 * undo afterwards.
 */

interface SuperAdmin {
  /** The DELETE route is keyed by this, not by an `id` field. */
  userId: string;
  email: string;
  name: string | null;
  grantedAt: string | null;
  /** The backend resolves the caller for us, so the page never compares emails. */
  isSelf: boolean;
  /** Granted to an address with no matching account yet — they can't sign in. */
  unresolved: boolean;
}

// GET answers a bare array. Rows missing a userId are dropped rather than
// rendered, since nothing on this page can act on one.
function readList(data: unknown): SuperAdmin[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((row): SuperAdmin | null => {
      const r = row as Record<string, unknown>;
      const userId =
        typeof r.userId === 'string'
          ? r.userId
          : typeof r.userId === 'number'
            ? String(r.userId)
            : null;
      if (!userId || typeof r.email !== 'string') return null;

      return {
        userId,
        email: r.email,
        name: typeof r.name === 'string' ? r.name : null,
        grantedAt: typeof r.grantedAt === 'string' ? r.grantedAt : null,
        isSelf: r.isSelf === true,
        unresolved: r.unresolved === true,
      };
    })
    .filter((row): row is SuperAdmin => row !== null);
}

/* Deliberately loose: the real check is upstream, and a stricter pattern here
   would only reject valid addresses the backend would have accepted. This just
   catches the typo that would otherwise cost a round trip. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SuperAdmins() {
  const [admins, setAdmins] = useState<SuperAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Which row is mid-DELETE — keyed by userId so only that row's button goes
     into its pending state, rather than disabling the whole table. */
  const [revoking, setRevoking] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hns/admin/super-admins');
      if (!res.ok) {
        // Admin-only routes upstream deny with a plain 404, not a 403, so a
        // bare "not found" here would point at the wrong problem.
        setError(
          res.status === 404 || res.status === 403
            ? 'This account can’t manage administrators, or the endpoint isn’t available yet.'
            : `Couldn’t load administrators (${res.status}).`,
        );
        setAdmins([]);
        return;
      }
      setAdmins(readList(await res.json()));
      setError(null);
    } catch {
      setError('Network error');
      setAdmins([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();

    setNotice(null);
    if (!looksLikeEmail(address)) {
      setFormError('Enter a valid email address.');
      return;
    }

    /* Admin access is total, so the address gets read back to the person
       before it is sent — a typo here grants a stranger the whole platform. */
    if (!window.confirm(`Give ${address} full platform administrator access?`)) return;

    setPending(true);
    setFormError(null);
    try {
      const res = await fetch('/api/hns/admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        const message = typeof body?.error === 'string' ? body.error : null;
        setFormError(
          message ?? `Couldn’t add that administrator (${res.status}).`,
        );
        return;
      }

      setEmail('');
      setNotice(`${address} is now a platform administrator.`);
      // Re-read rather than appending locally: the row upstream carries the
      // name and date this page shows, and we don't have them here.
      await load();
    } catch {
      setFormError('Network error');
    } finally {
      setPending(false);
    }
  }

  async function revoke(admin: SuperAdmin) {
    if (
      !window.confirm(
        `Remove platform administrator access from ${admin.email}? They will lose access to every workspace's data in this panel.`,
      )
    ) {
      return;
    }

    setNotice(null);
    setError(null);
    setRevoking(admin.userId);
    try {
      const res = await fetch(`/api/hns/admin/super-admins/${encodeURIComponent(admin.userId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        const message = typeof body?.error === 'string' ? body.error : null;
        setError(message ?? `Couldn’t remove that administrator (${res.status}).`);
        return;
      }

      setNotice(`${admin.email} is no longer a platform administrator.`);
      await load();
    } catch {
      setError('Network error');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Super Admins</h1>
          <p className="text-muted-foreground mb-8">
            Everyone who can reach this admin panel. Administrators see every workspace’s data and can
            add further administrators.
          </p>

          <form onSubmit={invite} className="mb-8 rounded-lg border border-border bg-card p-6">
            <label htmlFor="admin-email" className="block text-sm font-semibold text-foreground">
              Add an administrator
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              The email has to match the one they sign in with. Granting access to an address with no
              account yet works — it applies once they first sign in.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                placeholder="colleague@example.com"
                autoComplete="off"
                className="min-w-64 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? 'Adding…' : 'Add administrator'}
              </button>
            </div>

            {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
            {notice && <p className="mt-3 text-sm text-success">{notice}</p>}
          </form>

          {error && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-[var(--danger-soft)] p-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {admins === null ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : admins.length === 0 && !error ? (
            <div className="rounded-lg border bg-card py-12 text-center">
              <p className="text-muted-foreground">No administrators listed yet</p>
            </div>
          ) : admins.length > 0 ? (
            <div className="overflow-hidden rounded-lg bg-card shadow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-elevated">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Added</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {admins.map((a) => (
                      <tr key={a.userId} className="hover:bg-elevated">
                        <td className="px-6 py-4 text-sm text-foreground">
                          {a.email}
                          {a.isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          {/* Granted before that person had an account. They
                              hold the grant but can't sign in to use it, which
                              is worth saying plainly — otherwise the row looks
                              identical to a working one. */}
                          {a.unresolved && (
                            <span className="ml-2 text-xs text-muted-foreground">no account yet</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{a.name || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {a.grantedAt ? formatDate(a.grantedAt) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {/* Removing yourself would take away the page you'd
                              need to undo it. The button stays visible but
                              disabled, with the reason on hover, rather than
                              being silently missing. */}
                          <button
                            type="button"
                            onClick={() => revoke(a)}
                            disabled={a.isSelf || revoking === a.userId}
                            title={a.isSelf ? 'You can’t remove your own access' : undefined}
                            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-destructive transition hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:border-transparent disabled:text-faint disabled:hover:bg-transparent"
                          >
                            {revoking === a.userId ? 'Removing…' : 'Remove'}
                          </button>
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
