/**
 * Google Tag Manager plumbing — one container for the whole site.
 *
 * The marketing pages and the console are the same origin, so a single
 * container keeps the landing → signup → first-deploy funnel in one session.
 * Pre- and post-login tags are separated inside GTM by the `user_state`
 * variable (see SessionSignals) and by page path, NOT by a second container.
 *
 * SECURITY: /app/tokens renders live deploy-token secrets in the DOM. Every
 * third-party tag (ad pixels, session recorders like Hotjar/Clarity/FullStory)
 * MUST carry a blocking trigger on `Page Path matches RegEx ^/app` — otherwise
 * a recording tag captures customer credentials. Only first-party product
 * analytics belongs inside the console.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * The live container. Committed rather than left to an env var because
 * NEXT_PUBLIC_* is inlined at BUILD time, and every .env file here is
 * gitignored — so a CI build, or a deploy from a second machine, would ship a
 * bundle with no container at all and fail silently. A GTM container ID is
 * public by nature (it's in the page source of every visitor), so there's
 * nothing to protect by hiding it. Same reasoning wrangler.jsonc already
 * applies to HOSTNSOFT_API_URL: pinned in version control so it's reviewable.
 */
const DEFAULT_GTM_ID = "GTM-TGB5Z6TK";

/**
 * Production ships the container by default; dev and preview ship nothing, so
 * local traffic never lands in reporting. Set NEXT_PUBLIC_GTM_ID to override —
 * a test container to debug locally, or an empty string to switch GTM off in
 * production without a code change.
 */
export const GTM_ID =
  process.env.NEXT_PUBLIC_GTM_ID ?? (process.env.NODE_ENV === "production" ? DEFAULT_GTM_ID : "");

/**
 * Push an event onto the dataLayer.
 *
 * Safe before GTM has loaded: the array is created by the container snippet,
 * but anything pushed beforehand is replayed once gtm.js initialises, so no
 * event is lost to a race with the script tag.
 *
 * Never put PII here — no email, no name. GA4's terms prohibit it and every
 * tag in the container can read whatever lands on the dataLayer. Opaque ids
 * (user id, company id) are fine.
 */
export function pushToDataLayer(event: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
}

/** The landing-page A/B bucket, from the cookie middleware.ts sets. */
export function readLpVariant(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lp_variant=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
