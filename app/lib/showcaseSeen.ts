/**
 * What an organiser last saw on one of their showcase pages: when, and how
 * many apps were on it. The tab reads it to say "New apps" beside a page, and
 * the manage page reads it to tag the rows that arrived since.
 *
 * Kept in this browser only. It is a nicety, not a record — losing it (a new
 * device, cleared storage, a private window) just means nothing is tagged, so
 * every read and write swallows its errors instead of breaking the page.
 */

export type Seen = { at: string /* ISO */; total: number };

const key = (collectionId: string) => `embarko.showcase.seen.${collectionId}`;

/** Null on the server, when nothing is stored, or on any storage error. */
export function readSeen(collectionId: string): Seen | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(collectionId));
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (
      v &&
      typeof v === "object" &&
      typeof (v as Seen).at === "string" &&
      typeof (v as Seen).total === "number" &&
      !Number.isNaN(Date.parse((v as Seen).at))
    ) {
      return { at: (v as Seen).at, total: (v as Seen).total };
    }
    return null;
  } catch {
    return null;
  }
}

/** Stamps "seen now, with this many apps". Pass `at` to change only the
    count — after a removal, say, which lowers the total without anything
    new having been seen. Never throws. */
export function writeSeen(collectionId: string, total: number, at?: string): void {
  if (typeof window === "undefined") return;
  try {
    const value: Seen = { at: at ?? new Date().toISOString(), total };
    window.localStorage.setItem(key(collectionId), JSON.stringify(value));
  } catch {
    /* Storage blocked or full. The tags are optional, so say nothing. */
  }
}
