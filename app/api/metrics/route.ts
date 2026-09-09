import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { currentUser } from '../../lib/api';

// These are internal business numbers — which landing page wins, and how many
// visitors convert. Public reads would hand that to anyone who guessed the URL,
// so the dashboard's data source requires a login session.
export async function GET(req: NextRequest) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const db = getDb();
    const metrics = db.prepare('SELECT * FROM variant_metrics ORDER BY variant').all();
    
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
