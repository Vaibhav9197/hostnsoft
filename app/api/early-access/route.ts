import { NextResponse } from "next/server";

// External flow that receives each signup. Override with EARLY_ACCESS_WEBHOOK_URL.
const DEFAULT_WEBHOOK_URL = "https://flow.sokt.io/func/scripHKzReOX";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Payload = {
  name?: unknown;
  email?: unknown;
  business?: unknown;
  app?: unknown;
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function forwardToWebhook(url: string, record: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      // Don't let a slow webhook hang the request forever.
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to forward early-access signup to webhook:", err);
    return false;
  }
}

export async function POST(request: Request) {
  // Parse body
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const name = asTrimmedString(body.name);
  const email = asTrimmedString(body.email);
  const business = asTrimmedString(body.business);
  const app = asTrimmedString(body.app);

  // Validate
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Work email is required.";
  else if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (!business) fieldErrors.business = "Business name is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { ok: false, error: "Please check the form.", fieldErrors },
      { status: 422 }
    );
  }

  const record = {
    id: crypto.randomUUID(),
    name,
    email,
    business,
    app: app || null,
    createdAt: new Date().toISOString(),
  };

  const webhookUrl = process.env.EARLY_ACCESS_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  const forwarded = await forwardToWebhook(webhookUrl, record);

  if (!forwarded) {
    return NextResponse.json(
      { ok: false, error: "Could not submit your request. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { ok: true, message: "You're on the list. We'll be in touch soon.", id: record.id },
    { status: 201 }
  );
}

// Lightweight health check.
export async function GET() {
  return NextResponse.json({ ok: true });
}
