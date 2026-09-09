import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '.data', 'hero-ab.sqlite');
let db: Database.Database;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, query } = body;

    if (!email || !query) {
      return NextResponse.json(
        { error: 'Email and query are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO contact_messages (email, query)
      VALUES (?, ?)
    `);
    const result = stmt.run(email, query);

    return NextResponse.json({ 
      ok: true,
      id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}
