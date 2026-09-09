import { nanoid } from 'nanoid';
import { VARIANTS } from './variants';

const VISITOR_ID_COOKIE = 'visitor_id';
const VISITOR_ID_STORAGE_KEY = 'visitor_id';

/**
 * Map route name (v1-v4) to variant name (alpha-delta)
 */
function routeToVariant(route: string): string {
  const mapping: Record<string, string> = {
    'v1': 'alpha',
    'v2': 'beta',
    'v3': 'gamma',
    'v4': 'delta',
  };
  return mapping[route] || route;
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

  try {
    const visitorId = getOrCreateVisitorId();

    // Get route name from cookie (v1-v4) and convert to variant name (alpha-delta)
    const variantCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('lp_variant='));
    const routeName = variantCookie ? variantCookie.split('=')[1] : 'v1';
    const variant = routeToVariant(routeName);

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: visitorId,
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
 * Track page view on mount
 */
export function usePageView() {
  if (typeof window !== 'undefined') {
    trackEvent('page_view');
  }
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
