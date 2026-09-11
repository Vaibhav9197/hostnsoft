import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { isVariant } from '../../lib/variants';

/* This endpoint is public — anything on the internet can POST to it — so no
   value off the wire is ever pasted into SQL. Values are bound as parameters,
   and column names (which SQLite cannot bind) are looked up in this fixed map,
   so an unrecognised cta_type selects nothing instead of naming a column. */
const CTA_COLUMNS: Record<string, string> = {
  copy: 'cta_copy',
  login: 'cta_login',
  signup: 'cta_signup',
};

/**
 * Map event types to variant_metrics columns
 */
async function incrementMetric(variant: string, event: string, data?: any) {
  const db = getDb();

  /* One statement picks the counter, so the whole thing is a single batch
     round trip rather than two-to-three sequential ones. D1 is a network hop
     from the Worker, and this runs on every page view. */
  let update: string | null = null;

  if (event === 'page_view') {
    update = 'UPDATE variant_metrics SET page_views = page_views + 1 WHERE variant = ?';
  } else if (event === 'cta_clicked') {
    /* The click still counts toward the total even when the cta_type isn't one
       we break out separately — otherwise a typo upstream silently loses the
       click from both columns. */
    const column = CTA_COLUMNS[String(data?.cta_type)];
    update = column
      ? `UPDATE variant_metrics SET cta_clicks = cta_clicks + 1, ${column} = ${column} + 1 WHERE variant = ?`
      : 'UPDATE variant_metrics SET cta_clicks = cta_clicks + 1 WHERE variant = ?';
  } else if (event === 'deployment') {
    const column =
      data?.status === 'success' ? 'deployments_success' : 'deployments_failed';
    update = `UPDATE variant_metrics SET ${column} = ${column} + 1 WHERE variant = ?`;
  } else if (event === 'signup') {
    update = 'UPDATE variant_metrics SET signups = signups + 1 WHERE variant = ?';
  }

  const statements = [
    // Ensure row exists for variant
    db.prepare('INSERT OR IGNORE INTO variant_metrics (variant) VALUES (?)').bind(variant),
  ];
  if (update) statements.push(db.prepare(update).bind(variant));

  await db.batch(statements);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitor_id, variant, event, data } = body;

    if (!visitor_id || !variant || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    /* Anyone can post here, so an unrecognised arm is rejected rather than
       stored — otherwise the metrics table grows a row per made-up variant and
       the dashboard fills with noise. */
    if (!isVariant(variant)) {
      return NextResponse.json({ error: 'Unknown variant' }, { status: 400 });
    }

    // Log event to hero_events table
    const db = getDb();
    await db
      .prepare(
        `INSERT INTO hero_events (visitor_id, variant, event, url, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(visitor_id, variant, event, body.url || '', body.user_agent || '')
      .run();

    // Increment variant_metrics
    await incrementMetric(variant, event, data);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Event API error:', err);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
