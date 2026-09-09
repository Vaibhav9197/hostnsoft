import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '../../lib/api';

// The public contact form. Submissions go straight to hostnsoft-api's anonymous
// endpoint — POST /public/customer-query — which is the same store /admin
// /customer-query reads back, so anything sent here shows up under Public
// Queries. Nothing is kept locally: the old contact_messages table only holds
// the rows written before this moved to the API.
//
// This route exists purely as the BFF hop: API_BASE is a server-side address the
// browser can't reach.
export const runtime = 'nodejs';

const TYPES = ['feature', 'feedback'];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email, query, type } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== 'string' || typeof query !== 'string' || !email || !query) {
    return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
  }

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  if (typeof type !== 'string' || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Choose feature or feedback' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/public/customer-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The API names the text field `message`; the form still calls it `query`.
      body: JSON.stringify({ type, message: query, email }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      { error: 'Can’t reach Embarko right now — please try again shortly.' },
      { status: 502 },
    );
  }

  const text = await res.text();
  const data = text
    ? ((() => {
        try {
          return JSON.parse(text) as Record<string, string>;
        } catch {
          return null;
        }
      })())
    : null;

  if (!res.ok) {
    // The endpoint rate-limits at 10 per email per hour and says so in its own
    // message — pass that through rather than flattening it to "failed".
    return NextResponse.json(
      { error: data?.error ?? data?.message ?? 'Failed to send message' },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null }, { status: 200 });
}
