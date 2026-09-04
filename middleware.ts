import { NextResponse, type NextRequest } from "next/server";

/* Landing-page A/B/C test. `/` is rewritten — never redirected — to one of
   these routes, so the visitor stays on embarko.ai while a different page
   renders. A visitor's bucket is sticky via cookie, so they don't see the
   layout change between visits (which would poison the results). */
const VARIANTS = ["v1", "v2", "v3", "v4"] as const;
type Variant = (typeof VARIANTS)[number];

const COOKIE = "lp_variant";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function isVariant(value: string | undefined): value is Variant {
  return VARIANTS.includes(value as Variant);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  /* Direct hits on /v1, /v2, /v3 stay reachable for QA and for sharing a
     specific version, but must not be indexed — otherwise they compete with
     embarko.ai as duplicate content. The rewritten `/` response never passes
     through here, so the homepage itself stays indexable. */
  if (pathname !== "/") {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  /* ?lp=v2 forces a variant and re-buckets the visitor — how you preview one
     without clearing cookies by hand. */
  const override = searchParams.get("lp") ?? undefined;
  const existing = request.cookies.get(COOKIE)?.value;

  const assigned = isVariant(override)
    ? override
    : isVariant(existing)
      ? existing
      : VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

  const response = NextResponse.rewrite(new URL(`/${assigned}`, request.url));

  /* Readable from client JS on purpose: whatever analytics gets added later
     needs to tag events with the variant that produced them. */
  response.headers.set("x-lp-variant", assigned);

  if (assigned !== existing) {
    response.cookies.set(COOKIE, assigned, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    /* This response carries a fresh assignment. Cached at the edge, it would
       pin every later visitor to one variant and flatten the split. */
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}

export const config = {
  matcher: ["/", "/v1", "/v2", "/v3", "/v4"],
};
