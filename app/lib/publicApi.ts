import { API_BASE } from "./api";
import type { BillingPlan } from "./types";

/**
 * Reads for hostnsoft-api's unauthenticated `/public/*`-style and open
 * endpoints — no session needed, called server-side from marketing/public
 * pages. Add one function per endpoint here rather than a new file per
 * domain (showcase.ts predates this and keeps its own copy of `read`).
 */
async function read<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** The plan catalogue for the public pricing page. `/billing/plans` is
 *  unauthenticated and rate-limited on the API side. */
export async function listPublicPlans(): Promise<BillingPlan[]> {
  return (await read<BillingPlan[]>("/billing/plans")) ?? [];
}
