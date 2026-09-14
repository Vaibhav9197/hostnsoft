import type { D1Database } from "@cloudflare/workers-types";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The A/B metrics store.
 *
 * This was a better-sqlite3 file under DATA_DIR, which is right for a Node
 * host and impossible here: production runs as a Cloudflare Worker, workerd
 * cannot load a native addon, and there is no writable filesystem to put the
 * file on either. Every call threw, so the dashboard had nothing to show while
 * local dev looked perfectly healthy.
 *
 * D1 is SQLite, so the queries and the schema came across unchanged. What does
 * change is that everything is async — D1 goes over the network from the
 * Worker's point of view, where a file handle did not.
 *
 * The schema lives in migrations/, not in a migrate() call on first use: a
 * Worker has no per-deploy filesystem to lose, so there is nothing to recreate
 * at request time, and doing it per request would cost a round trip on every
 * hit.
 */
/**
 * The store the admin dashboard reads.
 *
 * Deployed this is the same database `getDb()` writes to. In `next dev` it is
 * the production one, because a dashboard showing whatever rows this laptop
 * happens to hold answers no question anyone has — you open it to see what
 * real visitors did.
 *
 * Reads only. Writes must keep going through `getDb()`, or local browsing
 * starts inventing production traffic.
 */
export function getAdminDb(): D1Database {
  /* Falls back to the write binding rather than failing: an older deployment,
     or a checkout whose wrangler.jsonc predates DB_ADMIN, should still show a
     dashboard. In production the two are the same database anyway. */
  return getCloudflareContext().env.DB_ADMIN ?? getDb();
}

export function getDb(): D1Database {
  const db = getCloudflareContext().env.DB;
  if (!db) {
    /* Loud rather than silent. The whole point of this file's history is that
       a broken store looked like "no traffic yet" on the dashboard — an empty
       table and a missing binding must never again be indistinguishable. */
    throw new Error(
      "D1 binding DB is not available. Check d1_databases in wrangler.jsonc, " +
        "and that next.config.mjs calls initOpenNextCloudflareForDev() for local dev.",
    );
  }
  return db;
}
