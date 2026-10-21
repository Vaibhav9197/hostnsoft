import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '../../lib/db';
import { currentSuperAdmin } from '../../lib/api';
import { VARIANT_NAMES } from '../../lib/variants';

/**
 * A/B results, aggregated from the raw events.
 *
 * Everything here counts **visitors, not events**. The old running totals
 * counted clicks, so one person clicking Copy three times read as three, and
 * CTR could exceed 100%. A landing-page test asks whether a page persuaded a
 * person, which is a question about people.
 *
 * That also fixes a mismatch the counters had: page views only fire on the
 * four landing pages, while the header's login/signup CTAs appear site-wide,
 * so a click could land in the numerator with nothing in the denominator.
 * Every rate below is restricted to visitors who actually saw the arm's
 * landing page, so the numerator is always a subset of the denominator.
 */

// These are internal business numbers — which landing page wins, and how many
// visitors convert. Public reads would hand that to anyone who guessed the URL,
// so the dashboard's data source requires a login session.

const RANGES: Record<string, string | null> = {
  '24h': '-1 day',
  '7d': '-7 days',
  '30d': '-30 days',
  '90d': '-90 days',
  all: null,
};

/* Crawlers, previewers and our own probes all hit the landing pages and all
   record a page view. Filtered on read rather than on write so the raw rows
   stay intact and the rule can be corrected later without losing history. */
const BOT_PATTERNS = ['%bot%', '%crawler%', '%spider%', '%curl%', '%wget%', '%headless%', '%lighthouse%', '%preview%'];

const NOT_A_BOT = BOT_PATTERNS.map(() => 'LOWER(COALESCE(user_agent, \'\')) NOT LIKE ?').join(' AND ');

export async function GET(req: NextRequest) {
  // Platform admins only. A plain login session used to be enough here, which
  // meant any signed-in customer could read this.
  if (!(await currentSuperAdmin())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const range = req.nextUrl.searchParams.get('range') ?? 'all';
  if (!(range in RANGES)) {
    return NextResponse.json({ error: 'Unknown range' }, { status: 400 });
  }
  const since = RANGES[range];

  try {
    const db = getAdminDb();

    const window = since ? `AND created_at >= datetime('now', ?)` : '';
    const binds = [...BOT_PATTERNS, ...(since ? [since] : [])];

    /* `seen` is every visitor who viewed this arm's landing page, and every
       other figure is counted only among them — that containment is what keeps
       each rate at or below 100%. */
    const sql = `
      WITH events AS (
        SELECT visitor_id, variant, event, data
        FROM hero_events
        WHERE ${NOT_A_BOT} ${window}
      ),
      seen AS (
        SELECT DISTINCT variant, visitor_id FROM events WHERE event = 'page_view'
      )
      SELECT
        s.variant,
        COUNT(DISTINCT s.visitor_id) AS visitors,
        COUNT(DISTINCT CASE WHEN e.event = 'cta_clicked' THEN e.visitor_id END) AS clicked,
        COUNT(DISTINCT CASE WHEN json_extract(e.data, '$.cta_type') = 'copy'   THEN e.visitor_id END) AS copied,
        COUNT(DISTINCT CASE WHEN json_extract(e.data, '$.cta_type') = 'login'  THEN e.visitor_id END) AS logged_in,
        COUNT(DISTINCT CASE WHEN json_extract(e.data, '$.cta_type') = 'signup' THEN e.visitor_id END) AS signed_up,
        COUNT(DISTINCT CASE WHEN e.event = 'deployment' AND json_extract(e.data, '$.status') = 'success' THEN e.visitor_id END) AS deployed,
        COUNT(DISTINCT CASE WHEN e.event = 'deployment' AND json_extract(e.data, '$.status') != 'success' THEN e.visitor_id END) AS deploy_failed,
        COUNT(DISTINCT CASE WHEN e.event = 'signin' THEN e.visitor_id END) AS signed_in
      FROM seen s
      LEFT JOIN events e ON e.visitor_id = s.visitor_id AND e.variant = s.variant
      GROUP BY s.variant
    `;

    const { results } = await db.prepare(sql).bind(...binds).all();

    const byVariant = new Map<string, any>();
    for (const row of results as any[]) byVariant.set(row.variant, row);

    const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(2) : '0.00');

    /* Every arm always appears, including ones with no traffic yet. A missing
       row and a zero row mean different things, and the dashboard should not
       have to guess which it is looking at. */
    const metrics = VARIANT_NAMES.map((variant) => {
      const r = byVariant.get(variant) ?? {};
      const visitors = Number(r.visitors ?? 0);
      const clicked = Number(r.clicked ?? 0);
      const deployed = Number(r.deployed ?? 0);
      const copied = Number(r.copied ?? 0);

      return {
        variant,
        visitors,
        cta_clicks: clicked,
        cta_copy: copied,
        cta_login: Number(r.logged_in ?? 0),
        cta_signup: Number(r.signed_up ?? 0),
        deployments_success: deployed,
        deployments_failed: Number(r.deploy_failed ?? 0),
        /* Recorded by /api/auth/exchange on a successful sign-in. Sign-ins,
           not new accounts: the API can't tell the two apart. */
        signed_in: Number(r.signed_in ?? 0),
        signin_rate: pct(Number(r.signed_in ?? 0), visitors),
        ctr: pct(clicked, visitors),
        /* The share of visitors who copied the deploy prompt. The test is ranked
           on this: deploys happen in the visitor's AI agent, so this site never
           sees one, and the deploy columns below stay at zero. */
        copy_rate: pct(copied, visitors),
        conversion_rate: pct(deployed, clicked),
        overall_conversion: pct(deployed, visitors),
      };
    });

    return NextResponse.json({ range, metrics });
  } catch (err) {
    console.error('Metrics API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
