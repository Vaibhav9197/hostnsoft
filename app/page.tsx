/*
  Server entry for the landing page.

  The hero A/B variant is resolved here, before anything renders, so the correct
  variant is in the very first HTML the browser receives. Middleware assigns it
  and forwards it on `x-hero-variant`; the cookie is the fallback for any request
  that bypassed middleware.
*/
import { headers, cookies } from "next/headers";
import EmbarkoPage from "./home-client";
import { HERO_VARIANTS, HERO_VARIANT_COOKIE, HERO_VARIANT_HEADER, type HeroVariant } from "./lib/heroVariants";

export default async function Page() {
  const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);

  const candidate =
    hdrs.get(HERO_VARIANT_HEADER) ?? cookieStore.get(HERO_VARIANT_COOKIE)?.value;

  const heroVariant: HeroVariant = HERO_VARIANTS.includes(candidate as HeroVariant)
    ? (candidate as HeroVariant)
    : "A";

  return <EmbarkoPage heroVariant={heroVariant} />;
}
