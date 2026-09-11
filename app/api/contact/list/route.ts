import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { currentSuperAdmin } from '../../../lib/api';

// This returns other people's email addresses and the messages they sent us.
// Unauthenticated reads would publish that to anyone who found the URL, so the
// same login session that guards the rest of /admin is required here.
export async function GET(req: NextRequest) {
  // Platform admins only. A plain login session used to be enough here, which
  // meant any signed-in customer could read this.
  if (!(await currentSuperAdmin())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const db = getDb();
    const { results } = await db
      .prepare(
        `SELECT id, email, query, created_at
         FROM contact_messages
         ORDER BY created_at DESC`,
      )
      .all();

    return NextResponse.json(results);
  } catch (err) {
    console.error('Contact list API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
