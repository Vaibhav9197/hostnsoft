import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { isVariant } from '../../lib/variants';

/**
 * Records one A/B event.
 *
 * Public — anything on the internet can POST here — so nothing off the wire is
 * trusted: the arm is checked against the known set, and every value is bound
 * as a parameter.
 *
 * One row per event, and nothing else. This used to also keep running totals
 * in a `variant_metrics` table, which meant two tallies of the same thing that
 * could drift, and which threw away everything the dashboard actually wants:
 * who did it, when, and on which page. The metrics endpoint aggregates these
 * rows instead.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      visitor_id?: string;
      variant?: string;
      event?: string;
      url?: string;
      user_agent?: string;
      data?: unknown;
    };
    const { visitor_id, variant, event } = body;

    if (!visitor_id || !variant || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    /* Anyone can post here, so an unrecognised arm is rejected rather than
       stored — otherwise the dashboard fills with made-up variants. */
    if (!isVariant(variant)) {
      return NextResponse.json({ error: 'Unknown variant' }, { status: 400 });
    }

    /* Stored as sent, and only ever read back with json_extract for the two
       keys we aggregate on — so an unexpected shape costs a null, not a
       failure. Capped because this endpoint is public and the column is
       otherwise an open invitation. */
    const payload = body.data == null ? null : JSON.stringify(body.data).slice(0, 2000);

    await getDb()
      .prepare(
        `INSERT INTO hero_events (visitor_id, variant, event, url, user_agent, data)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(visitor_id, variant, event, body.url || '', body.user_agent || '', payload)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Event API error:', err);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
