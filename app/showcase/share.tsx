"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/**
 * Share actions for a Showcase page.
 *
 * The URL is read from the browser rather than passed in: these pages are
 * cached, and a URL baked in at render time would be whatever host built the
 * page, not the one the reader is on.
 *
 * No generated share image yet — X and LinkedIn will fall back to the site's
 * default card until one exists.
 */
export function ShareRow({ title }: { title: string }) {
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

  /* Built on click, not at render: window doesn't exist while this is
     server-rendered, and the value would be stale by hydration anyway. */
  function open(kind: "x" | "linkedin") {
    const url = encodeURIComponent(window.location.href);
    const href =
      kind === "x"
        ? `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${url}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const item =
    "inline-flex items-center gap-1.5 rounded-[8px] border border-border px-3.5 py-[10px] text-[13px] font-medium text-muted-foreground transition hover:border-[var(--line-strong)] hover:text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className={item}>
        {copied ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {copied ? "Link copied" : "Copy link"}
      </button>
      <button type="button" onClick={() => open("x")} className={item}>
        Share on X
      </button>
      <button type="button" onClick={() => open("linkedin")} className={item}>
        LinkedIn
      </button>
    </div>
  );
}
