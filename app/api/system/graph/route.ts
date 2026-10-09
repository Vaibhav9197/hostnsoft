import { NextResponse } from "next/server";

import { catalogue, denyUnlessSuperAdmin, otherStores, STORE_ID } from "../../../lib/system/catalogue";

/* Every table in all three stores with its column count, and every link
   between them, declared and inferred — for the Live PRD's Tables canvas.
   The site database is read live; the other two come from the scanned
   schema. No rows: those are fetched per table, as each card comes into view. */

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessSuperAdmin();
  if (denied) return denied;

  try {
    const { shapes, links } = await catalogue();
    const others = otherStores();
    return NextResponse.json(
      {
        store: STORE_ID,
        tables: [
          ...shapes.map((s) => ({ name: s.name, store: STORE_ID, columns: s.columns.length, pk: s.pk, rows: true })),
          ...others.flatMap((o) => o.shapes.map((s) => ({ name: s.name, store: o.id, columns: s.columns.length, pk: s.pk, rows: false }))),
        ],
        links: [...links, ...others.flatMap((o) => o.links)],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Couldn’t read the database." }, { status: 502 });
  }
}
