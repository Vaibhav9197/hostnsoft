import { NextResponse, type NextRequest } from "next/server";

import { VARIANTS, VARIANT_NAMES, isVariant } from "@/app/lib/variants";

/* Landing-page split test across four arms — Alpha, Beta, Gamma, Delta. `/` is
   rewritten — never redirected — to one of these routes, so the visitor stays
   on embarko.ai while a different page renders. A visitor's bucket is sticky
   via cookie, so they don't see the layout change between visits (which would
   poison the results).

   The arm name is deliberately not the route it renders: the name is what gets
   reported in analytics and should stay stable, while /v1../v4 are just where
   the pages happen to live. Swapping which page an arm serves is a change to
   the map in app/lib/variants.ts alone. */

const COOKIE = "lp_variant";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* Direct hits on /v1../v4 stay reachable for QA and for sharing a
     specific version, but must not be indexed — otherwise they compete with
     embarko.ai as duplicate content. The rewritten `/` response never passes
     through here, so the homepage itself stays indexable. */
  if (pathname !== "/") {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  /* The cookie is the only source of a visitor's arm — nothing on the URL can
     set or change it. To look at a specific landing page, hit /v1../v4
     directly; that renders the page without touching anyone's bucket. */
  const existing = request.cookies.get(COOKIE)?.value;

  const assigned = isVariant(existing)
    ? existing
    : VARIANT_NAMES[Math.floor(Math.random() * VARIANT_NAMES.length)];

  const response = NextResponse.rewrite(new URL(VARIANTS[assigned], request.url));

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
