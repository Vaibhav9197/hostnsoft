import { NextRequest, NextResponse } from "next/server";

import { CATEGORIES, TOOLS, createSubmission } from "../../../lib/showcase";

/**
 * Public Showcase submission.
 *
 * Anything on the internet can POST here, so nothing off the wire is trusted:
 * every field is length-capped, every URL has to parse as http(s), and the row
 * lands as 'pending' regardless of what the body says. Approval is a separate
 * human act — there is no field here that can grant it.
 */

const LIMITS = {
  name: 80,
  tagline: 160,
  whatItDoes: 600,
  whyBuilt: 600,
  creatorName: 80,
  organisation: 120,
  hackathonCode: 40,
} as const;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * A URL we are willing to render as a link.
 *
 * Scheme is checked explicitly rather than by prefix: `new URL()` happily
 * accepts `javascript:alert(1)`, which would then be written straight into an
 * href on the app page.
 */
function httpUrl(value: unknown): string | null {
  const raw = text(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/* An option we offer, or nothing. A tool or category we don't recognise is
   dropped rather than stored, so the collection rules that match on these
   columns can't be seeded with arbitrary strings from a form post. */
function oneOf(value: unknown, allowed: readonly string[]): string | null {
  const raw = text(value, 40);
  return raw && allowed.includes(raw) ? raw : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const name = text(body.name, LIMITS.name);
  const tagline = text(body.tagline, LIMITS.tagline);
  const appUrl = httpUrl(body.appUrl);
  const creatorName = text(body.creatorName, LIMITS.creatorName);

  /* Reported together rather than one at a time: the form shows them all at
     once, so failing on the first would make the reader fix and resubmit
     repeatedly to discover the rest. */
  const missing: string[] = [];
  if (!name) missing.push("app name");
  if (!tagline) missing.push("what it does");
  if (!appUrl) missing.push("a valid app URL");
  if (!creatorName) missing.push("your name");
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Please add ${missing.join(", ")}.`, fields: missing },
      { status: 400 },
    );
  }

  const rawTags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string")
    : [];

  try {
    const { slug } = await createSubmission({
      name: name!,
      tagline: tagline!,
      appUrl: appUrl!,
      whatItDoes: text(body.whatItDoes, LIMITS.whatItDoes),
      whyBuilt: text(body.whyBuilt, LIMITS.whyBuilt),
      creatorName: creatorName!,
      creatorProfile: httpUrl(body.creatorProfile),
      builtWith: oneOf(body.builtWith, TOOLS),
      category: oneOf(body.category, CATEGORIES),
      tags: rawTags,
      /* Uppercased because that is how codes are printed and handed out —
         "iitindore26" typed in lower case is the same event. */
      hackathonCode: text(body.hackathonCode, LIMITS.hackathonCode)?.toUpperCase() ?? null,
      videoUrl: httpUrl(body.videoUrl),
      screenshotUrl: httpUrl(body.screenshotUrl),
    });

    /* The slug comes back so the confirmation can link to the page this will
       become — it 404s until approval, so it is returned, not redirected to. */
    return NextResponse.json({ ok: true, slug }, { status: 201 });
  } catch (e) {
    console.error("Showcase submission failed:", e);
    return NextResponse.json(
      { error: "Couldn’t save that just now. Please try again." },
      { status: 500 },
    );
  }
}
