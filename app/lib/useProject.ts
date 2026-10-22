"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HnsError } from "./client";
import { markMainDataSettled } from "./earlyReads";
import { projectsApi } from "./hnsApi";
import { readLastSeen, writeLastSeen } from "./lastSeen";
import type { ProjectDetail } from "./types";

/* "Shared fetcher" means shared endpoint, not shared state: every caller gets
   its own copy, and the sidebar mounts its own alongside whichever sub-page is
   open. So a page that changes the project has no way to tell the others, and
   its own reload() leaves the sidebar rendering what it fetched on mount.
   That was invisible while the only editable field was the display name, which
   the sidebar doesn't show. It stopped being invisible with the web address,
   which the sidebar shows twice — the live-URL link and the deploy prompt.

   A revision counter every instance subscribes to is the smallest thing that
   fixes it for all of them at once, without lifting project state into a
   context that nothing else needs. Deliberately not router.refresh(): these
   are client components fetching in an effect, so refreshing server components
   does not touch them. */
let revision = 0;
const listeners = new Set<() => void>();

/* The breadcrumbs, the project nav and the page itself each mount a useProject
   for the same project at the same moment, so every project page asked the API
   for the same detail three times — and the backend answers three concurrent
   reads slower than one, so the page waited on the slowest of them. Instances
   now share one request while it is in flight and for a moment after it lands,
   which covers everything mounted by the same navigation. Short on purpose:
   opening the project again later must not show what it looked like before. */
const SHARE_MS = 2000;
const shared = new Map<string, { read: Promise<ProjectDetail>; settledAt: number | null }>();

function readShared(companyId: string, projectId: string): Promise<ProjectDetail> {
  const key = `${companyId}:${projectId}`;
  const hit = shared.get(key);
  if (hit && (hit.settledAt === null || Date.now() - hit.settledAt < SHARE_MS)) return hit.read;

  const entry = { read: projectsApi.get(companyId, projectId), settledAt: null as number | null };
  shared.set(key, entry);
  entry.read.then(
    () => { entry.settledAt = Date.now(); },
    // A failure is dropped at once, so the next mount retries instead of inheriting it.
    () => { if (shared.get(key) === entry) shared.delete(key); },
  );
  return entry.read;
}

/** Re-fetch every mounted useProject. Call after changing a project. */
export function refreshProjects() {
  // Everything shared predates the change. Clearing it first makes the
  // instances that re-read below share one fresh request.
  shared.clear();
  revision += 1;
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}
const getSnapshot = () => revision;
/* Only ever bumped from a client event handler, so this is always 0 during
   render on the server — a constant, as useSyncExternalStore requires. */
const getServerSnapshot = () => 0;

// Shared fetcher for one project's detail, used by the project sidebar and each
// project sub-page so they stay in sync against the same endpoint.
export function useProject(companyId: string | null, projectId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rev = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const seenRev = useRef(rev);

  /* Mounting and a refreshProjects() re-read share a request with the other
     instances; the reload() a page calls after its own change always goes out
     fresh, since it is asking for the state that change just produced. */
  const read = useCallback(async (share: boolean, first = false) => {
    if (!companyId) return;
    const lastSeenKey = `project:${companyId}:${projectId}`;
    try {
      const data = await (share ? readShared(companyId, projectId) : projectsApi.get(companyId, projectId));
      setProject(data);
      setError(null);
      writeLastSeen(lastSeenKey, data);
    } catch (e) {
      // A failed first read drops last visit's copy rather than showing it
      // under the error; a failed refresh keeps what is on screen.
      if (first) setProject(null);
      /* The API answers 404 both for an app that's gone and for one this
         person's role doesn't reach (only Billing, which reaches no apps;
         everyone else can at least view every app) — on purpose, so it
         can't say which. */
      setError(
        e instanceof HnsError && e.status === 404
          ? "This app isn’t here. It may have been removed, or your role doesn’t include apps."
          : e instanceof Error ? e.message : "This app couldn’t be found.",
      );
    } finally {
      // Lets the header's billing read go (earlyReads.ts).
      if (first) markMainDataSettled();
    }
  }, [companyId, projectId]);

  const reload = useCallback(() => read(false), [read]);

  useEffect(() => {
    // Open on last visit's copy, if any, while the real one loads. See lastSeen.ts.
    setProject(companyId ? readLastSeen<ProjectDetail>(`project:${companyId}:${projectId}`) : null);
    setError(null);
    read(true, true);
  }, [read, companyId, projectId]);

  /* Separate from the mount/identity effect above so a refresh doesn't blank
     `project` first: that would flash every consumer back to its skeleton for
     an update the reader didn't ask for and may not even be looking at. The
     ref makes this a no-op on mount, where the effect above already fetched. */
  useEffect(() => {
    if (seenRev.current === rev) return;
    seenRev.current = rev;
    read(true);
  }, [rev, read]);

  return { project, error, reload };
}
