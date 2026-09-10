import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { currentSuperAdmin } from '../../lib/api';
import { VARIANT_NAMES } from '../../lib/variants';

// These are internal business numbers — which landing page wins, and how many
// visitors convert. Public reads would hand that to anyone who guessed the URL,
// so the dashboard's data source requires a login session.
export async function GET(req: NextRequest) {
  // Platform admins only. A plain login session used to be enough here, which
  // meant any signed-in customer could read this.
  if (!(await currentSuperAdmin())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const db = getDb();
    /* Arm order, not alphabetical: sorting the names put Delta before Gamma,
       which reads as a mistake next to the A/B/C/D the arms stand for. Rows
       for arms no longer in the table sort last rather than disappearing. */
    const order = (variant: string) => {
      const i = VARIANT_NAMES.indexOf(variant as (typeof VARIANT_NAMES)[number]);
      return i === -1 ? VARIANT_NAMES.length : i;
    };
    const metrics = (db.prepare('SELECT * FROM variant_metrics').all() as any[]).sort(
      (a, b) => order(a.variant) - order(b.variant),
    );
    
    // Calculate conversion rates
    const metricsWithRates = metrics.map((m: any) => ({
      ...m,
      ctr: m.page_views > 0 ? ((m.cta_clicks / m.page_views) * 100).toFixed(2) : '0.00',
      conversion_rate: m.cta_clicks > 0 ? ((m.deployments_success / m.cta_clicks) * 100).toFixed(2) : '0.00',
      overall_conversion: m.page_views > 0 ? ((m.deployments_success / m.page_views) * 100).toFixed(2) : '0.00',
    }));

    return NextResponse.json(metricsWithRates);
  } catch (err) {
    console.error('Metrics API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
