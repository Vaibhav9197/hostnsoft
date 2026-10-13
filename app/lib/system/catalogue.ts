/* Read-only access to the site database's own catalogue, for the Live PRD.
 *
 * Only SELECT and PRAGMA run here, against the admin binding (the production
 * database, even in `next dev`). Table names are never interpolated until they
 * have been matched against the catalogue, since SQL cannot bind identifiers.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { currentSuperAdmin, PAT_COOKIE } from "../api";
import { getAdminDb } from "../db";
import facts from "./facts.generated.json";
import { inferLinks, type Link, type TableShape } from "./links";

export const STORE_ID = "store";

/* D1 and SQLite bookkeeping, not the product's data. */
const INTERNAL = /^(_cf_|sqlite_|d1_)/;

/** The page's own gate, repeated per call: the flag is re-read from
 *  hostnsoft-api each time, so a demotion takes effect at once. */
export async function denyUnlessSuperAdmin(): Promise<NextResponse | null> {
  if (await currentSuperAdmin()) return null;
  const signedIn = !!(await cookies()).get(PAT_COOKIE)?.value;
  return signedIn
    ? NextResponse.json({ error: "This is for platform admins." }, { status: 403 })
    : NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export type Column = { name: string; type: string; nullable: boolean; key: boolean; secret: boolean };

type PragmaColumn = { name: string; type: string; notnull: number; pk: number };
type PragmaFk = { table: string; from: string; to: string };

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

export async function tableNames(): Promise<string[]> {
  const { results } = await getAdminDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all<{ name: string }>();
  return results.map((r) => r.name).filter((n) => !INTERNAL.test(n));
}

export async function columnsOf(table: string): Promise<PragmaColumn[]> {
  const { results } = await getAdminDb().prepare(`PRAGMA table_info(${q(table)})`).all<PragmaColumn>();
  return results;
}

export async function declaredLinks(table: string): Promise<Link[]> {
  try {
    const { results } = await getAdminDb().prepare(`PRAGMA foreign_key_list(${q(table)})`).all<PragmaFk>();
    return results.map((r) => ({ from: table, fromColumn: r.from, to: r.table, toColumn: r.to, declared: true }));
  } catch {
    return [];
  }
}

/** Every table's shape and every link, declared and inferred. No rows. */
export async function catalogue(): Promise<{ shapes: (TableShape & { types: PragmaColumn[] })[]; links: Link[] }> {
  const names = await tableNames();
  const shapes = await Promise.all(
    names.map(async (name) => {
      const cols = await columnsOf(name);
      return {
        name,
        columns: cols.map((c) => c.name),
        pk: cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name),
        types: cols,
      };
    }),
  );
  const declared = (await Promise.all(names.map(declaredLinks))).flat();
  return { shapes, links: inferLinks(shapes, declared) };
}

export function quote(name: string): string {
  return q(name);
}

/* --- the other two stores ----------------------------------------------------
   The API database and the deploy server's traffic database belong to
   Embarko too, but live on the Embarko server where this app can't reach
   them. Their structure comes from the scanned facts (Prisma schema, CREATE
   TABLE statements); their rows are never read. */

type FactTable = { id: string; store: string; name: string; columns: string[] };
type FactStore = { id: string; name: string; rows: boolean };
const F = facts as unknown as { stores: FactStore[]; tables: FactTable[]; foreignKeys: { from: string; to: string }[] };

/* Shared keys that cross stores: traffic rows name the app by its address. */
const CROSS_STORE: Link[] = [
  { from: "request_log", fromColumn: "app_name", to: "Project", toColumn: "slug", declared: false },
  { from: "resource_sample", fromColumn: "app_name", to: "Project", toColumn: "slug", declared: false },
];

export type OtherStore = { id: string; name: string; shapes: TableShape[]; links: Link[] };

export function otherStores(): OtherStore[] {
  return F.stores
    .filter((s) => !s.rows)
    .map((s) => {
      const tables = F.tables.filter((t) => t.store === s.id);
      const shapes = tables.map((t) => ({ name: t.name, columns: t.columns, pk: t.columns.includes("id") ? ["id"] : [] }));
      const split = (ref: string) => {
        const [, , rest] = ref.split(":");
        const [table, column] = rest.split(".");
        return { table, column };
      };
      const declared = F.foreignKeys
        .filter((k) => k.from.startsWith(`table:${s.id}:`))
        .map((k) => ({ from: split(k.from).table, fromColumn: split(k.from).column, to: split(k.to).table, toColumn: split(k.to).column, declared: true }));
      const names = new Set(shapes.map((x) => x.name));
      return {
        id: s.id,
        name: s.name,
        shapes,
        links: [...inferLinks(shapes, declared), ...CROSS_STORE.filter((l) => names.has(l.from))],
      };
    });
}
