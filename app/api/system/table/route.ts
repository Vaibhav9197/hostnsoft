import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminDb } from "../../../lib/db";
import { catalogue, denyUnlessSuperAdmin, otherStores, quote, STORE_ID } from "../../../lib/system/catalogue";
import { SECRET_COLUMN } from "../../../lib/system/links";

/* One table for the Live PRD (/admin/system): its columns from the database's
   own catalogue, its newest 3 rows, and how it links to the others.

   Fetched one table at a time, only when someone opens it — never in bulk.
   Read-only: nothing here writes. Secret-looking columns come back blank. */

export const dynamic = "force-dynamic";

const ROWS = 3;
const TIMEOUT_MS = 6_000;
const TEXT_CAP = 300;
const TIME_COLUMN = /^(created_at|first_seen|updated_at|.+_at)$/;

function timeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
  ]);
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessSuperAdmin();
  if (denied) return denied;

  const db = req.nextUrl.searchParams.get("db") ?? STORE_ID;
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (db !== STORE_ID) {
    /* The API and traffic databases: structure from the scan, never rows. */
    const other = otherStores().find((o) => o.id === db);
    const shape = other?.shapes.find((s) => s.name === name);
    if (!other || !shape) return NextResponse.json({ error: "No such table." }, { status: 404 });
    return NextResponse.json(
      {
        store: other.id,
        name,
        columns: shape.columns.map((c) => ({ name: c, type: "—", nullable: true, key: shape.pk.includes(c), secret: SECRET_COLUMN.test(c) })),
        rows: [],
        rowsNote: `Rows stay on the Embarko server: this page can read only the site database. Structure from the ${other.name}'s schema in code.`,
        linksOut: other.links.filter((l) => l.from === name),
        linksIn: other.links.filter((l) => l.to === name && l.from !== name),
        readAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { shapes, links } = await timeout(catalogue());
    const shape = shapes.find((s) => s.name === name);
    if (!shape) return NextResponse.json({ error: "No such table." }, { status: 404 });

    const columns = shape.types.map((c) => ({
      name: c.name,
      type: c.type || "ANY",
      nullable: c.notnull === 0 && c.pk === 0,
      key: c.pk > 0,
      secret: SECRET_COLUMN.test(c.name),
    }));

    /* Newest first: an integer key counts up, else a timestamp column, else
       SQLite's own insertion order. */
    const intKey = shape.types.filter((c) => c.pk > 0);
    const time = shape.types.find((c) => TIME_COLUMN.test(c.name));
    const order =
      intKey.length === 1 && /INT/i.test(intKey[0].type)
        ? `${quote(intKey[0].name)} DESC`
        : time
          ? `${quote(time.name)} DESC`
          : "rowid DESC";

    let rows: Record<string, unknown>[] = [];
    let rowsNote: string | null = null;
    try {
      const { results } = await timeout(
        getAdminDb().prepare(`SELECT * FROM ${quote(name)} ORDER BY ${order} LIMIT ${ROWS}`).all<Record<string, unknown>>(),
      );
      rows = results.map((r) => {
        const out: Record<string, unknown> = {};
        for (const c of columns) {
          const v = r[c.name];
          out[c.name] = c.secret ? null : typeof v === "string" && v.length > TEXT_CAP ? v.slice(0, TEXT_CAP) + "…" : v;
        }
        return out;
      });
    } catch (err) {
      rowsNote = err instanceof Error && err.message === "timeout" ? "The rows took too long to read." : "The rows couldn’t be read.";
    }

    return NextResponse.json(
      {
        store: STORE_ID,
        name,
        columns,
        rows,
        rowsNote,
        linksOut: links.filter((l) => l.from === name),
        linksIn: links.filter((l) => l.to === name && l.from !== name),
        readAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const slow = err instanceof Error && err.message === "timeout";
    return NextResponse.json(
      { error: slow ? "The database took too long to answer." : "Couldn’t read the database." },
      { status: slow ? 504 : 502 },
    );
  }
}
