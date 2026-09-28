import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "../../../lib/api";
import { getAppForContact } from "../../../lib/showcase";

// POST /api/showcase/contact — "Contact Dev" on a Showcase app page.
//
// The browser sends only the app's slug; the owner's email is looked up here
// and never leaves the server. The message goes through the same anonymous
// endpoint as the site's contact form (POST /public/customer-query), which
// delivers it to `toEmail`, the app owner's `userEmail`. Apps without one
// don't show the button, and this route refuses them.
//
// Spam protection is invisible to people: a honeypot field real users never
// see, and a minimum time between opening the form and sending it. The API
// also rate-limits per sender email.
export const runtime = "nodejs";

const MIN_FILL_MS = 2500;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (k: string) => (typeof body?.[k] === "string" ? (body[k] as string).trim() : "");

  const slug = str("slug");
  const name = str("name");
  const email = str("email");
  const message = str("message");
  const website = str("website"); // honeypot
  const openedAt = Number(body?.openedAt);

  /* A bot that filled the hidden field, or submitted instantly, gets the same
     "sent" answer as a person — telling it why would only help it adapt. */
  const age = Date.now() - openedAt;
  if (website || !Number.isFinite(openedAt) || age < MIN_FILL_MS || age > MAX_AGE_MS) {
    return NextResponse.json({ ok: true });
  }

  if (!slug) return NextResponse.json({ error: "Missing app." }, { status: 400 });
  if (!name || name.length > 120) return NextResponse.json({ error: "Please add your name." }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Please add a valid email." }, { status: 400 });
  if (message.length < 10 || message.length > 4000) {
    return NextResponse.json({ error: "Please write a short message (at least 10 characters)." }, { status: 400 });
  }

  const found = await getAppForContact(slug).catch(() => null);
  if (!found) return NextResponse.json({ error: "That app isn't on the Showcase." }, { status: 404 });
  const { app, ownerEmail } = found;
  /* The button only shows when the owner has an email; refuse the rest so
     nothing is sent that can't be delivered. */
  if (!ownerEmail) return NextResponse.json({ error: "This developer can't be contacted yet." }, { status: 404 });

  const text = [
    `Contact Dev — ${app.name} (${app.appUrl})`,
    `Showcase page: /showcase/app/${app.slug}`,
    `From: ${name} <${email}>`,
    "",
    message,
  ].join("\n");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/public/customer-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "other",
        message: text,
        email,
        name,
        source: "showcase-contact-dev",
        appSlug: app.slug,
        toEmail: ownerEmail,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "Can’t reach Embarko right now — please try again shortly." }, { status: 502 });
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as Record<string, string> | null;
    return NextResponse.json({ error: data?.error ?? data?.message ?? "Couldn’t send your message." }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
