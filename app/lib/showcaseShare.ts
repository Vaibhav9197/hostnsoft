import { useSyncExternalStore } from "react";

/**
 * The links and words an organiser hands out for an event page.
 *
 * Built from the browser's own origin rather than SITE, so what gets copied
 * is the host the organiser is actually on. In development that means
 * localhost — don't print a poster from there.
 */

export type ShareUrls = {
  /** The public event page. Works signed out; the QR code points here. */
  pageUrl: string;
  /** The panel's add-an-app form with this page chosen. Needs sign-in. */
  addUrl: string;
};

export function shareUrls(slug: string, origin: string): ShareUrls {
  return {
    pageUrl: `${origin}/showcase/${slug}`,
    addUrl: `${origin}/app/showcase/submit?page=${encodeURIComponent(slug)}`,
  };
}

/** "https://embarko.ai/showcase/x" → "embarko.ai/showcase/x", for display. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** The ready-to-send invite. The intro paragraph appears only when there is one. */
export function whatsappText(title: string, intro: string | null | undefined, urls: ShareUrls): string {
  const parts = [`${title} has a showcase page. Every app built here, in one place:\n${urls.pageUrl}`];
  const about = intro?.trim();
  if (about) parts.push(about);
  parts.push(`Built something? Add yours, with a screenshot, in about a minute:\n${urls.addUrl}`);
  parts.push("Building with Claude, Cursor or Codex? Open the page, copy the prompt, and your AI adds the app for you.");
  return parts.join("\n\n");
}

/** Opens WhatsApp (app or web) with the message filled in and no contact chosen. */
export function waHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const noopSubscribe = () => () => {};

/**
 * The current origin, or null while server-rendering and hydrating. Null
 * rather than a guess, so nothing renders a link that changes under the
 * reader a moment later.
 */
export function useOrigin(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => null,
  );
}
