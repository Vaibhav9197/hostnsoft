import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/db';
import { currentSuperAdmin } from '../../../lib/api';

/**
 * Votes per feature, for /admin/feature-votes. Platform admins only: the
 * voter list carries customers' email addresses.
 */
export async function GET() {
  if (!(await currentSuperAdmin())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { results } = await getAdminDb()
      .prepare(
        `SELECT feature_id, email, company_id, query_id, created_at
         FROM feature_votes
         ORDER BY created_at DESC`,
      )
      .all<{
        feature_id: string;
        email: string;
        company_id: string | null;
        query_id: string | null;
        created_at: string;
      }>();
    return NextResponse.json({ votes: results });
  } catch (err) {
    console.error('Feature votes summary error:', err);
    return NextResponse.json({ error: 'Failed to load votes' }, { status: 500 });
  }
}
