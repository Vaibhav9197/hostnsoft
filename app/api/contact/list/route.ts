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

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const messages = db.prepare(`
      SELECT id, email, query, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json(messages);
  } catch (err) {
    console.error('Contact list API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
