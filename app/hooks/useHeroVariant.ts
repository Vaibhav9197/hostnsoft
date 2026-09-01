"use client";

import { useEffect } from "react";
import { HERO_VARIANT_COOKIE, isHeroVariant, type HeroVariant } from "@/app/lib/heroVariants";

export type { HeroVariant };

const TRACK_ENDPOINT = "/api/hero/track";

/* One impression per page load. Also neutralises React StrictMode's
   double-invoked effects in dev, which would otherwise double-count. */
let impressionSent = false;

/**
 * Reports that the visitor saw `variant`.
 *
 * Assignment happens in middleware, so this hook only observes — it never
 * changes which variant is shown and therefore cannot cause a re-render.
 */
export function useHeroImpression(variant: HeroVariant) {
  useEffect(() => {
    if (impressionSent) return;
    impressionSent = true;
    track("hero_impression", variant);
  }, [variant]);
}

/** Call when the visitor clicks the hero CTA. */
export function trackHeroCTA(variant: HeroVariant) {
  track("hero_cta_click", variant);
}

function track(event: string, variant: HeroVariant) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    event,
    variant,
    url: window.location.pathname,
  });

  try {
    // sendBeacon survives the navigation a CTA click starts.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, new Blob([payload], { type: "application/json" }));
    } else {
      void fetch(TRACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Hero A/B]", event, variant);
    }
  } catch (error) {
    // Analytics must never break the page.
    console.error("Hero tracking failed:", error);
  }
}

/** Reads the assigned variant on the client, for code outside React. */
export function getCurrentHeroVariant(): HeroVariant {
  if (typeof document === "undefined") return "A";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${HERO_VARIANT_COOKIE}=([^;]*)`)
  );
  const value = match?.[1];
  return isHeroVariant(value) ? value : "A";
}
