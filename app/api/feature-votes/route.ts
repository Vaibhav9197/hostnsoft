import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { sessionUser } from '../../lib/api';
import { FEATURES } from '../../lib/features';

/**
 * Upvotes for upcoming features, from the "What's missing?" box in the panel.
 *
 * GET  — the features the signed-in user has already voted for.
 * POST — { features: string[], companyId?: string } casts several at once.
 * PATCH — { queryId: string, features: string[] } ties votes just cast to the
 *         message sent with them, so the admin sees them on that message.
 *
 * Who is voting comes from the session cookie, never the body. One vote per
 * user per feature is the table's primary key, so a repeat is ignored rather
 * than counted — that holds across browsers and devices.
 */

// Only what's still upcoming can be voted for. A shipped feature drops out of
// the picker and is refused here, so nobody votes on something they have.
const VOTABLE = new Set(FEATURES.filter((f) => f.upcoming).map((f) => f.id));

async function votedBy(userId: string): Promise<string[]> {
  const { results } = await getDb()
    .prepare(`SELECT feature_id FROM feature_votes WHERE user_id = ?`)
    .bind(userId)
    .all<{ feature_id: string }>();
  return results.map((r) => r.feature_id);
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    return NextResponse.json({ voted: await votedBy(user.id) });
  } catch (err) {
    console.error('Feature votes read error:', err);
    return NextResponse.json({ error: 'Couldn’t load your votes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    features?: unknown;
    companyId?: unknown;
  } | null;
  const picked = Array.isArray(body?.features)
    ? [...new Set(body.features.filter((f): f is string => typeof f === 'string'))]
    : [];
  if (picked.length === 0 || picked.some((f) => !VOTABLE.has(f))) {
    return NextResponse.json({ error: 'Pick at least one upcoming feature' }, { status: 400 });
  }
  const companyId = typeof body?.companyId === 'string' ? body.companyId.slice(0, 64) : null;

  try {
    const db = getDb();
    const insert = db.prepare(
      `INSERT OR IGNORE INTO feature_votes (user_id, feature_id, email, company_id)
       VALUES (?, ?, ?, ?)`,
    );
    await db.batch(picked.map((f) => insert.bind(user.id, f, user.email, companyId)));
    return NextResponse.json({ voted: await votedBy(user.id) });
  } catch (err) {
    console.error('Feature votes write error:', err);
    return NextResponse.json({ error: 'Couldn’t save your votes. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { queryId?: unknown; features?: unknown } | null;
  const queryId =
    typeof body?.queryId === 'string' || typeof body?.queryId === 'number' ? String(body.queryId).slice(0, 64) : '';
  const picked = Array.isArray(body?.features)
    ? [...new Set(body.features.filter((f): f is string => typeof f === 'string' && VOTABLE.has(f)))]
    : [];
  if (!queryId || picked.length === 0) {
    return NextResponse.json({ error: 'Nothing to link' }, { status: 400 });
  }

  try {
    // Only the caller's own votes, and only ones not already tied to an
    // earlier message — a vote belongs to the message it was sent with.
    await getDb()
      .prepare(
        `UPDATE feature_votes SET query_id = ?
         WHERE user_id = ? AND query_id IS NULL
           AND feature_id IN (${picked.map(() => '?').join(', ')})`,
      )
      .bind(queryId, user.id, ...picked)
      .run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Feature votes link error:', err);
    return NextResponse.json({ error: 'Couldn’t link votes' }, { status: 500 });
  }
}
