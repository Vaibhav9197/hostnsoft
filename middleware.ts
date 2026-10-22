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

/* The agent guide answers in three formats at one address. A browser gets the
   HTML page; an agent gets Markdown or JSON, the same content without the
   site around it. An explicit .md / .json always wins over the Accept header,
   so a pasted URL gives the same answer to everyone.

   Agent fetch tools ask for Markdown first ("text/markdown, text/html, *\/*"),
   so Markdown is checked before HTML; only a client that asks for HTML and
   not Markdown — a browser — gets the page. */
function guideFormat(request: NextRequest): "md" | "json" | null {
  const format = request.nextUrl.searchParams.get("format");
  if (format === "md" || format === "markdown") return "md";
  if (format === "json") return "json";
  /* Next's own page fetches (client navigation, prefetch) are not agents. */
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return null;
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/x-component")) return null;
  if (accept.includes("application/json")) return "json";
  if (accept.includes("text/markdown")) return "md";
  if (accept.includes("text/html")) return null;
  return "md";
}

function guide(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const rest = pathname.replace(/^\/docs/, "").replace(/^\/+|\/+$/g, "");

  /* "/docs.md" leaves ".md", which is the contents page like "/docs/index.md". */
  const explicit = /^([a-z0-9-]*)\.(md|json)$/i.exec(rest);
  let file: string | null = null;
  if (explicit) file = `${explicit[1] || "index"}.${explicit[2].toLowerCase()}`;
  else if (/^[a-z0-9-]*$/i.test(rest)) {
    const fmt = guideFormat(request);
    if (fmt) file = `${rest || "index"}.${fmt}`;
  }

  /* Vary on every answer, the HTML page included: one address, two bodies. */
  const response = file
    ? NextResponse.rewrite(new URL(`/guide-raw/${file}`, request.url))
    : NextResponse.next();
  response.headers.set("Vary", "Accept");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/docs" || pathname.startsWith("/docs/") || pathname === "/docs.md" || pathname === "/docs.json") {
    return guide(request);
  }

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
  matcher: ["/", "/v1", "/v2", "/v3", "/v4", "/v5", "/docs", "/docs/:path*", "/docs.md", "/docs.json"],
};
