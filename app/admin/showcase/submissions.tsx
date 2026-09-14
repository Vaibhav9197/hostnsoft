"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminNav } from "../../components/AdminNav";
import { formatDate } from "../../lib/format";

/* The Showcase review queue. Nothing a creator submits is public until it is
   approved here, so this page is the only thing between the open form and the
   front page. */

interface Submission {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  app_url: string;
  video_url: string | null;
  creator_name: string;
  built_with: string | null;
  category: string | null;
  hackathon_code: string | null;
  status: "pending" | "approved" | "rejected";
  featured: number;
  pro_status: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-elevated text-foreground",
  approved: "bg-[var(--ok-soft)] text-success",
  rejected: "bg-[var(--danger-soft)] text-destructive",
};

export default function Submissions() {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/showcase");
      if (!res.ok) {
        setError(`Couldn’t load submissions (${res.status}).`);
        setRows([]);
        return;
      }
      const data = (await res.json()) as { submissions: Submission[] };
      setRows(data.submissions ?? []);
      setError(null);
    } catch {
      setError("Network error");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Reloads rather than patching state locally: the row's derived bits
     (ordering, which actions apply) all come from the server's view, and
     keeping a second copy of that logic here is how the two drift. */
  async function update(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/showcase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `Update failed (${res.status}).`);
        return;
      }
      await load();
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto max-w-6xl p-8">
        <h1 className="text-2xl font-bold">Showcase</h1>
        <p className="mt-1.5 text-muted-foreground">
          {rows === null
            ? "Loading…"
            : `${rows.length} submission${rows.length === 1 ? "" : "s"}, ${pending} awaiting review.`}
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {rows && rows.length === 0 && !error && (
          <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            No submissions yet.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {rows?.map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base font-semibold">{row.name}</h2>
                    <span
                      className={`rounded-full px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em] ${
                        STATUS_STYLE[row.status] ?? "bg-elevated"
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.featured === 1 && (
                      <span className="rounded-full bg-elevated px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em]">
                        featured
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 max-w-[70ch] text-sm text-muted-foreground">{row.tagline}</p>

                  <p className="mt-2.5 text-[13px] text-muted-foreground">
                    {row.creator_name}
                    {row.built_with && ` · ${row.built_with}`}
                    {row.category && ` · ${row.category}`}
                    {row.hackathon_code && ` · ${row.hackathon_code}`}
                    {` · ${formatDate(row.created_at)}`}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-4 text-[13px]">
                    <a
                      href={row.app_url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="underline underline-offset-2"
                    >
                      Open app
                    </a>
                    {row.status === "approved" && (
                      <a
                        href={`/showcase/apps/${row.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        Showcase page
                      </a>
                    )}
                    {row.video_url && (
                      <a
                        href={row.video_url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="underline underline-offset-2"
                      >
                        Watch video
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {row.status !== "approved" && (
                    <Action busy={busyId === row.id} onClick={() => update(row.id, { status: "approved" })}>
                      Approve
                    </Action>
                  )}
                  {row.status !== "rejected" && (
                    <Action busy={busyId === row.id} onClick={() => update(row.id, { status: "rejected" })}>
                      Reject
                    </Action>
                  )}
                  {row.status === "approved" && (
                    <Action
                      busy={busyId === row.id}
                      onClick={() => update(row.id, { featured: row.featured !== 1 })}
                    >
                      {row.featured === 1 ? "Unfeature" : "Feature"}
                    </Action>
                  )}
                </div>
              </div>

              {/* Only shown when there is actually a video to judge — the Pro
                  offer is separate from whether the app belongs in Showcase. */}
              {row.video_url && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <span className="text-[13px] text-muted-foreground">
                    1-year Pro request: {row.pro_status ?? "requested"}
                  </span>
                  <Action busy={busyId === row.id} onClick={() => update(row.id, { proStatus: "granted" })}>
                    Grant
                  </Action>
                  <Action busy={busyId === row.id} onClick={() => update(row.id, { proStatus: "declined" })}>
                    Decline
                  </Action>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Action({
  busy,
  onClick,
  children,
}: {
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="rounded-md border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-[var(--line-strong)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
