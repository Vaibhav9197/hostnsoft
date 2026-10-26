/**
 * The Worker's bindings, as `getCloudflareContext().env` hands them out.
 *
 * Hand-written and committed rather than produced by `npm run cf-typegen`:
 * that writes cloudflare-env.d.ts, which is gitignored and half a megabyte of
 * generated runtime types, so Cloudflare's builder would type-check without it
 * and fail on an unresolved D1Database. Keep this in step with the bindings and
 * vars in wrangler.jsonc.
 *
 * The binding types are pulled in as inline `import(...)` types on purpose. A
 * `/// <reference types="@cloudflare/workers-types" />` here is global, and it
 * replaces the DOM's `Response`/`fetch` declarations for the whole project —
 * which turns every `await res.json()` in the app from `any` into `unknown`
 * and breaks around twenty call sites that have nothing to do with D1.
 */
interface CloudflareEnv {
  /** A/B metrics store. See migrations/ for its schema. */
  DB: import("@cloudflare/workers-types").D1Database;
  /** The same database as DB. Bound separately so local dev can read the
   *  production figures while its writes stay local -- see wrangler.jsonc. */
  DB_ADMIN: import("@cloudflare/workers-types").D1Database;
  ASSETS: import("@cloudflare/workers-types").Fetcher;
  HOSTNSOFT_API_URL: string;
  NEXT_PUBLIC_MSG91_REFERENCE_ID: string;
  NEXT_PUBLIC_MSG91_WIDGET_SCRIPT: string;
  EARLY_ACCESS_WEBHOOK_URL: string;
  /** Shared secret the monitoring scheduler sends as X-Monitor-Secret. Dashboard secret. */
  MONITOR_SECRET?: string;
  /** A super-admin's MSG91 proxy_auth_token, so the monitor can read /admin/* upstream. Dashboard secret. */
  MONITOR_PROXY_TOKEN?: string;
}
