import { projectsApi } from "./hnsApi";
import type { Project } from "./types";

/* The console can't render until /auth/me says who is signed in, and the apps
   list can't ask for its data until it knows the active workspace — so every
   page load ran identity, then data, one after the other.

   The workspace the person used last is already in localStorage. Session asks
   for that workspace's data at the same moment it asks who you are, and the
   pages pick the answer up here once they mount. If identity says the stored
   workspace is not the active one (or it is gone), the key doesn't match and
   the page fetches as it always did — a wrong guess costs one wasted request,
   never wrong data on screen.

   An answer is kept for a few seconds after it lands. That is long enough for
   the page to mount and for React's dev double-mount to share it, and short
   enough that coming back to a page never shows a stale list. */

const FRESH_MS = 5000;

const reads = new Map<string, Promise<unknown>>();

function start(key: string, run: () => Promise<unknown>) {
  const read = run();
  reads.set(key, read);
  const drop = () => {
    if (reads.get(key) === read) reads.delete(key);
  };
  // A failed read is dropped at once so the page retries instead of inheriting it.
  read.then(() => setTimeout(drop, FRESH_MS), drop);
}

export function startEarlyReads(companyId: string) {
  // The apps list is only read by the home page. Anywhere else it is a wasted
  // call competing with the ones that page does need. Billing is not started
  // here at all: see whenMainDataSettled below.
  if (window.location.pathname === "/app") {
    start(`projects:${companyId}`, () => projectsApi.list(companyId));
  }
}

export const earlyProjects = (companyId: string) =>
  (reads.get(`projects:${companyId}`) as Promise<Project[]> | undefined) ?? null;

/* The API answers several reads at once slower than one: on the live site the
   apps list took ~650ms alone and 850–1240ms with billing running beside it.
   Billing only feeds the plan chip in the header, so outside the Billing page
   it waits until the page's own data has landed — the home page's apps list or
   a project page's detail mark that — or a short fallback for pages with no
   main read of their own. */
let settle: () => void = () => {};
const settled = new Promise<void>((resolve) => { settle = resolve; });

/** Call once the page's main data has arrived (or failed). Later calls are no-ops. */
export function markMainDataSettled() {
  settle();
}

export function whenMainDataSettled(fallbackMs = 1500): Promise<void> {
  return Promise.race([settled, new Promise<void>((r) => setTimeout(r, fallbackMs))]);
}
