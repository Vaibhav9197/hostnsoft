"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/**
 * Share actions for a Showcase page.
 *
 * The URL is read from the browser rather than passed in: these pages are
 * cached, and a URL baked in at render time would be whatever host built the
 * page, not the one the reader is on.
 *
 * No generated share image yet — X and LinkedIn fall back to the page's
 * screenshot or the site's default card.
 */

type Net = "x" | "linkedin" | "whatsapp";

/* Built on click, not at render: window doesn't exist while this is
   server-rendered, and the value would be stale by hydration anyway. */
function openShare(kind: Net, title: string) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);
  const href =
    kind === "x"
      ? `https://x.com/intent/post?text=${text}&url=${url}`
      : kind === "linkedin"
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        : `https://wa.me/?text=${text}%20${url}`;
  window.open(href, "_blank", "noopener,noreferrer");
}

function useCopyLink() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard is unavailable on insecure origins and when the user has
         denied it. The link is in the address bar either way, so this stays
         quiet rather than raising an error over something cosmetic. */
    }
  }
  return { copied, copy };
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />
  </svg>
);
const InIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
  </svg>
);
export const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
  </svg>
);

/** Round share buttons for category, tag and collection pages — the same
 *  look as the app page's, at the right end of the title line. */
export function ShareRow({ title }: { title: string }) {
  const { copied, copy } = useCopyLink();
  return (
    <div className="sc-share sc-share-title">
      <button type="button" className="sc-btn" onClick={() => openShare("x", title)} aria-label="Share on X">
        <XIcon />
      </button>
      <button type="button" className="sc-btn" onClick={() => openShare("linkedin", title)} aria-label="Share on LinkedIn">
        <InIcon />
      </button>
      <button type="button" className="sc-btn" onClick={() => openShare("whatsapp", title)} aria-label="Share on WhatsApp">
        <WaIcon />
      </button>
      <button type="button" className="sc-btn" onClick={copy} aria-label={copied ? "Link copied" : "Copy link"}>
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      </button>
      <output className="sc-sr" aria-live="polite">
        {copied ? "Link copied to clipboard." : ""}
      </output>
    </div>
  );
}

/** The app page's share block: round network buttons plus a copy-link icon. */
export function ShareApp({ title, name }: { title: string; name: string }) {
  const { copied, copy } = useCopyLink();
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    setCanNative(typeof navigator.share === "function");
  }, []);

  return (
    <div>
      <h2 className="sc-eyebrow">Share {name}</h2>
      <div className="sc-share">
        <button type="button" className="sc-btn" onClick={() => openShare("x", title)} aria-label="Share on X">
          <XIcon />
        </button>
        <button type="button" className="sc-btn" onClick={() => openShare("linkedin", title)} aria-label="Share on LinkedIn">
          <InIcon />
        </button>
        <button type="button" className="sc-btn" onClick={() => openShare("whatsapp", title)} aria-label="Share on WhatsApp">
          <WaIcon />
        </button>
        <button type="button" className="sc-btn" onClick={copy} aria-label={copied ? "Link copied" : "Copy link"}>
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        </button>
        {canNative && (
          <button
            type="button"
            className="sc-btn"
            aria-label="More ways to share"
            onClick={() => navigator.share({ title: name, text: title, url: window.location.href }).catch(() => {})}
          >
            <Share2 aria-hidden="true" />
          </button>
        )}
      </div>
      <output className="sc-sr" aria-live="polite">
        {copied ? "Link copied to clipboard." : ""}
      </output>
    </div>
  );
}
