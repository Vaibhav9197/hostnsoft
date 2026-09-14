import { nanoid } from 'nanoid';
import { isVariant, variantForPath } from './variants';

const VISITOR_ID_COOKIE = 'visitor_id';
const VISITOR_ID_STORAGE_KEY = 'visitor_id';

/**
 * Which arm an event belongs to.
 *
 * The page wins over the cookie, matching how the deploy prompt already
 * resolves this: a direct hit on /v1../v4 — QA, or a shared link — shows a
 * page that need not match the arm the visitor was bucketed into, and the
 * honest answer is the page the event actually happened on. Everywhere else
 * (the header's login/signup, which appear site-wide) the cookie decides.
 *
 * Null when neither knows, and the caller drops the event. This used to
 * default to `v1`, which silently filed every cookie-less visitor under alpha
 * — middleware only sets the cookie on `/`, so anyone landing straight on
 * /v2../v4, or blocking cookies, inflated one arm at the others' expense.
 */
function currentVariant(): string | null {
  const fromPath = variantForPath(window.location.pathname);
  if (fromPath) return fromPath;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('lp_variant='));
  const value = cookie?.split('=')[1];
  return isVariant(value) ? value : null;
}

/**
 * Get or create a visitor ID from cookie/localStorage
 */
export function getOrCreateVisitorId(): string {
  // Try to get from localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (stored) return stored;

    // Try to get from cookie
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${VISITOR_ID_COOKIE}=`));
    
    if (cookie) {
      const visitorId = cookie.split('=')[1];
      localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
      return visitorId;
    }
  }

  // Generate new ID
  const visitorId = nanoid();
  
  if (typeof window !== 'undefined') {
    // Store in localStorage
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
    
    // Store in cookie (1 year expiry)
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${VISITOR_ID_COOKIE}=${visitorId}; expires=${date.toUTCString()}; path=/`;
  }

  return visitorId;
}

/**
 * Track an event
 */
export async function trackEvent(
  event: string,
  data?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  const variant = currentVariant();
  /* No arm, nothing to learn. Recording it against a guess is worse than not
     recording it — one arm's numbers move for reasons that have nothing to do
     with the page it is being judged on. */
  if (!variant) return;

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* The CTAs open modals today, but a future one may navigate away, and an
         in-flight fetch is cancelled when the page unloads. keepalive lets it
         finish regardless. */
      keepalive: true,
      body: JSON.stringify({
        visitor_id: getOrCreateVisitorId(),
        variant,
        event,
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        data,
      }),
    });
  } catch (err) {
    console.error('Tracking error:', err);
  }
}

/**
 * One page view per visitor per page per session.
 *
 * The landing pages fire this from an effect, which React runs twice in
 * StrictMode, and a client-side navigation back to the page runs it again —
 * both inflate the denominator every rate on the dashboard divides by.
 * sessionStorage rather than a module variable, so a reload doesn't re-count
 * either, while a genuinely new session still does.
 */
export function trackPageView() {
  if (typeof window === 'undefined') return;

  const key = `pv:${window.location.pathname}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* Private mode, or storage disabled. Counting one view twice beats
       counting none at all, so fall through and track. */
  }

  trackEvent('page_view');
}

/**
 * Track CTA click
 */
export function trackCTA(ctaType: 'copy' | 'login' | 'signup') {
  trackEvent('cta_clicked', { cta_type: ctaType });
}

/**
 * Track deployment
 */
export function trackDeployment(status: 'success' | 'failed', durationMs?: number) {
  trackEvent('deployment', { 
    status, 
    duration_ms: durationMs 
  });
}
