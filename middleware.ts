/*
  Assigns the hero A/B variant before the page renders.

  Doing this in middleware (rather than a client effect) is what removes the
  flicker: the server already knows the variant when it renders the first HTML,
  so the visitor never sees variant A swap out for their assigned one.

  `request.cookies.set` is what makes it work on a first visit — it mutates the
  cookies the forwarded request carries, so the server component reading the
  header/cookie in the same pass sees the freshly picked variant, not nothing.
*/
import { NextResponse, type NextRequest } from "next/server";
import {
  HERO_COOKIE_MAX_AGE,
  HERO_VARIANT_COOKIE,
  HERO_VARIANT_HEADER,
  HERO_VISITOR_COOKIE,
  HERO_VISITOR_HEADER,
  isHeroVariant,
  pickHeroVariant,
} from "./app/lib/heroVariants";

export function middleware(request: NextRequest) {
  const existingVariant = request.cookies.get(HERO_VARIANT_COOKIE)?.value;
  const existingVisitor = request.cookies.get(HERO_VISITOR_COOKIE)?.value;

  const variant = isHeroVariant(existingVariant) ? existingVariant : pickHeroVariant();
  const visitorId = existingVisitor || crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HERO_VARIANT_HEADER, variant);
  requestHeaders.set(HERO_VISITOR_HEADER, visitorId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const cookieOptions = {
    path: "/",
    maxAge: HERO_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false, // readable by the client tracker
  } as const;

  if (variant !== existingVariant) {
    response.cookies.set(HERO_VARIANT_COOKIE, variant, cookieOptions);
  }
  if (visitorId !== existingVisitor) {
    response.cookies.set(HERO_VISITOR_COOKIE, visitorId, cookieOptions);
  }

  return response;
}

export const config = {
  // Landing page only — nothing else is under test.
  matcher: "/",
};
