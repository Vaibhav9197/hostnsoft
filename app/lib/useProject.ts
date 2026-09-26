"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { projectsApi } from "./hnsApi";
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

/** Re-fetch every mounted useProject. Call after changing a project. */
export function refreshProjects() {
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

  const reload = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await projectsApi.get(companyId, projectId);
      setProject(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This project couldn’t be found.");
    }
  }, [companyId, projectId]);

  useEffect(() => {
    setProject(null);
    setError(null);
    reload();
  }, [reload]);

  /* Separate from the mount/identity effect above so a refresh doesn't blank
     `project` first: that would flash every consumer back to its skeleton for
     an update the reader didn't ask for and may not even be looking at. The
     ref makes this a no-op on mount, where the effect above already fetched. */
  useEffect(() => {
    if (seenRev.current === rev) return;
    seenRev.current = rev;
    reload();
  }, [rev, reload]);

  return { project, error, reload };
}
