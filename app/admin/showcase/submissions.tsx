"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminNav } from "../../components/AdminNav";
import { adminShowcaseApi } from "../../lib/hnsApi";
import { HnsError } from "../../lib/client";
import { formatDate } from "../../lib/format";
import type { AdminShowcaseCollection, AdminShowcaseListing, ShowcaseType } from "../../lib/types";

/* Showcase oversight. Nothing is approved here — pages and listings are live
   on creation. One tab per kind, for oversight and featuring. Talks to
   hostnsoft-api /admin/showcase/*, which 404s for non-admins. */

type Tab = "pages" | "apps";
type Filter = ShowcaseType | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "event", label: "Event pages" },
  { value: "public", label: "Workspace pages" },
];

const TYPE_STYLE: Record<ShowcaseType, string> = {
  public: "bg-[var(--ok-soft)] text-success",
  event: "bg-elevated text-foreground",
};

function describe(e: unknown, fallback: string): string {
  /* The API returns a plain 404 to non-admins rather than a 403, so say
     what that most likely means instead of "not found". */
  if (e instanceof HnsError && e.status === 404) {
    return "This account can’t administer Showcase, or the endpoint isn’t available yet.";
  }
  return e instanceof Error ? e.message : fallback;
}

export default function Submissions() {
  const [tab, setTab] = useState<Tab>("pages");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto w-full max-w-6xl p-8">
        <h1 className="text-2xl font-bold">Showcase</h1>

        <div className="mt-5 flex gap-1 border-b border-border" role="tablist">
          {(
            [
              ["pages", "Pages"],
              ["apps", "Listed apps"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setError(null);
              }}
              className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-medium transition-colors ${
                tab === value
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {tab === "pages" ? <Pages onError={setError} /> : <Listings onError={setError} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ pages */

function Pages({ onError }: { onError: (m: string | null) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<AdminShowcaseCollection[] | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const page = await adminShowcaseApi.listCollections({
        type: filter === "all" ? undefined : filter,
        limit: 100,
      });
      setRows(page.items);
      setTotal(page.total);
      onError(null);
    } catch (e) {
      onError(describe(e, "Couldn’t load pages."));
      setRows([]);
    }
  }, [filter, onError]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  return (
    <>
      <p className="mt-5 text-muted-foreground">
        {rows === null ? "Loading…" : `${total} page${total === 1 ? "" : "s"}.`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by type">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              filter === f.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-[var(--line-strong)] hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows && rows.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
          No pages here.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {rows?.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold">{c.title}</h2>
                <span
                  className={`rounded-full px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em] ${TYPE_STYLE[c.type]}`}
                >
                  {c.type}
                </span>
              </div>
              <p className="mt-1 font-mono text-[13px] text-muted-foreground">
                <a href={`/showcase/${c.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  /showcase/{c.slug}
                </a>
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Owned by <b className="text-foreground">{c.companyName ?? c.companyId}</b> · {formatDate(c.createdAt)} ·{" "}
                {c.counts.publicCount} live, {c.counts.total} listed
              </p>
              {c.intro && <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{c.intro}</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ listings */

function Listings({ onError }: { onError: (m: string | null) => void }) {
  const [rows, setRows] = useState<AdminShowcaseListing[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const page = await adminShowcaseApi.listProjects({ limit: 100 });
      setRows(page.items);
      setTotal(page.total);
      onError(null);
    } catch (e) {
      onError(describe(e, "Couldn’t load listings."));
      setRows([]);
    }
  }, [onError]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  async function feature(id: string, featured: boolean) {
    setBusyId(id);
    try {
      await adminShowcaseApi.setFeatured(id, featured);
      await load();
    } catch (e) {
      onError(describe(e, "Update failed."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <p className="mt-5 text-muted-foreground">
        {rows === null ? "Loading…" : `${total} app${total === 1 ? "" : "s"} listed across every page.`}
      </p>

      {rows && rows.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
          Nothing listed yet.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {rows?.map((l) => {
          const live = !l.isPrivate;
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base font-semibold">{l.name}</h2>
                    {l.featured && (
                      <span className="rounded-full bg-elevated px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em]">
                        featured
                      </span>
                    )}
                    {l.isPrivate && (
                      <span className="rounded-full bg-elevated px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em]">
                        hidden by organiser
                      </span>
                    )}
                    {l.status !== "approved" && (
                      <span className="rounded-full bg-elevated px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em]">
                        {l.status === "pending" ? "awaiting approval" : "rejected"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 max-w-[70ch] text-sm text-muted-foreground">{l.tagline}</p>
                  <p className="mt-2.5 text-[13px] text-muted-foreground">
                    {l.creatorName}
                    {l.builtWith && ` · ${l.builtWith}`}
                    {l.category && ` · ${l.category}`}
                    {` · ${formatDate(l.createdAt)}`}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    On{" "}
                    <a href={`/showcase/${l.collection.slug}`} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
                      /showcase/{l.collection.slug}
                    </a>{" "}
                    (owned by {l.ownerCompany.name ?? l.ownerCompany.id}) · app belongs to{" "}
                    <b className="text-foreground">{l.submitterCompany.name ?? l.submitterCompany.id}</b>
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-4 text-[13px]">
                    <a href={l.appUrl} target="_blank" rel="noreferrer nofollow" className="underline underline-offset-2">
                      Open app
                    </a>
                    {live && (
                      <a href={`/showcase/app/${l.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        Showcase page
                      </a>
                    )}
                    {l.videoUrl && (
                      <a href={l.videoUrl} target="_blank" rel="noreferrer nofollow" className="underline underline-offset-2">
                        Watch video
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Action busy={busyId === l.id} onClick={() => feature(l.id, !l.featured)}>
                    {l.featured ? "Unfeature" : "Feature"}
                  </Action>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Action({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
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
