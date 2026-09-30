import { billingApi, projectsApi } from "./hnsApi";
import type { BillingPlan, BillingStatus, Project } from "./types";

/* The console can't render until /auth/me says who is signed in, and the apps
   list and billing chip can't ask for their data until they know the active
   workspace — so every page load ran identity, then data, one after the other.

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
  // call competing with the ones that page does need.
  if (window.location.pathname === "/app") {
    start(`projects:${companyId}`, () => projectsApi.list(companyId));
  }
  start(`billing:${companyId}`, () => billingApi.status(companyId));
  start("plans", () => billingApi.plans());
}

export const earlyProjects = (companyId: string) =>
  (reads.get(`projects:${companyId}`) as Promise<Project[]> | undefined) ?? null;

export const earlyBilling = (companyId: string) =>
  (reads.get(`billing:${companyId}`) as Promise<BillingStatus> | undefined) ?? null;

export const earlyPlans = () => (reads.get("plans") as Promise<BillingPlan[]> | undefined) ?? null;
