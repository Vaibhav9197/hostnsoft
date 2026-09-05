"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { GTM_ID, pushToDataLayer, readLpVariant } from "@/app/lib/gtm";

/**
 * Virtual pageviews for App Router client navigation.
 *
 * GTM's built-in "All Pages" trigger fires on gtm.js init only. Next's client
 * navigations swap the tree without a document load, so moving from
 * /app/members to /app/tokens would otherwise record nothing at all.
 *
 * This fires on EVERY view including the first, rather than skipping the
 * initial load and letting GTM's own trigger cover it. One event source means
 * one pageview per view with identical parameters — no gap where the first
 * pageview carries different fields, and no race against gtm.js init.
 *
 * ┌─ GTM SETUP REQUIRED ────────────────────────────────────────────────────┐
 * │ In your GA4 Configuration tag, UNCHECK "Send a page view event when     │
 * │ this configuration loads", and trigger the GA4 Event tag (event name    │
 * │ `page_view`) on a Custom Event trigger matching `page_view` instead.    │
 * │ Leaving the automatic pageview on will double-count every landing.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* Effects run twice per mount under React StrictMode in dev, and the effect
     also re-runs whenever the searchParams object identity changes without the
     query actually differing. Both would double-count, so the last URL sent is
     the guard rather than the dependency list. */
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!GTM_ID) return;

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    if (lastSent.current === pagePath) return;
    lastSent.current = pagePath;

    pushToDataLayer({
      event: "page_view",
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      lp_variant: readLpVariant(),
    });
  }, [pathname, searchParams]);

  return null;
}

/**
 * useSearchParams() opts the whole subtree into client-side rendering unless
 * it sits under a Suspense boundary — without one, every statically rendered
 * page in the app silently becomes dynamic. The boundary is the fix, and it
 * belongs here rather than at the call site so it can't be forgotten.
 */
export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
