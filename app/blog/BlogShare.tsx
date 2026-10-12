"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";
import { siFacebook, siReddit, siTelegram, siWhatsapp, siX } from "simple-icons";
import { InIcon, useCopyLink } from "../showcase/share";

/**
 * Share buttons for a blog post: the Showcase's round buttons, with the
 * networks a guide gets passed around on. The URL is read from the browser
 * when a button is pressed, as in app/showcase/share.tsx, so a cached page
 * never shares the host that built it.
 */

type Net = "linkedin" | "whatsapp" | "x" | "facebook" | "reddit" | "telegram" | "email";

function shareHref(net: Net, title: string, url: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (net) {
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${t}%20${u}`;
    case "x":
      return `https://x.com/intent/post?text=${t}&url=${u}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case "email":
      return `mailto:?subject=${t}&body=${t}%0A%0A${u}`;
  }
}

const Brand = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
);

const NETS: { net: Net; label: string; icon: React.ReactNode }[] = [
  { net: "linkedin", label: "LinkedIn", icon: <InIcon /> },
  { net: "whatsapp", label: "WhatsApp", icon: <Brand path={siWhatsapp.path} /> },
  { net: "x", label: "X", icon: <Brand path={siX.path} /> },
  { net: "facebook", label: "Facebook", icon: <Brand path={siFacebook.path} /> },
  { net: "reddit", label: "Reddit", icon: <Brand path={siReddit.path} /> },
  { net: "telegram", label: "Telegram", icon: <Brand path={siTelegram.path} /> },
  { net: "email", label: "Email", icon: <Mail aria-hidden="true" /> },
];

const ROUND =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--line-control)] bg-[var(--surface)] text-foreground transition-colors hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&_svg]:size-4";

const CHIP =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line-control)] bg-[var(--surface)] px-4 text-sm font-semibold text-foreground transition-colors hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&_svg]:size-4";

/**
 * `compact` is the sidebar row (icons only). The default is the end-of-post
 * block, which names each network so a reader on a phone sees what they tap.
 */
export function BlogShare({ title, compact = false }: { title: string; compact?: boolean }) {
  const { copied, copy } = useCopyLink();
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    setCanNative(typeof navigator.share === "function");
  }, []);

  const open = (net: Net) => {
    const href = shareHref(net, title, window.location.href.split("#")[0]);
    if (net === "email") window.location.href = href;
    else window.open(href, "_blank", "noopener,noreferrer");
  };

  const copyButton = (
    <button type="button" className={compact ? ROUND : CHIP} onClick={copy} aria-label={compact ? (copied ? "Link copied" : "Copy link") : undefined}>
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      {!compact && (copied ? "Link copied" : "Copy link")}
    </button>
  );

  const nativeButton = canNative && (
    <button
      type="button"
      className={compact ? ROUND : CHIP}
      aria-label={compact ? "More ways to share" : undefined}
      onClick={() => navigator.share({ title, url: window.location.href.split("#")[0] }).catch(() => {})}
    >
      <Share2 aria-hidden="true" />
      {!compact && "More"}
    </button>
  );

  return (
    <div>
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2.5"}>
        {NETS.map(({ net, label, icon }) => (
          <button
            key={net}
            type="button"
            className={compact ? ROUND : CHIP}
            onClick={() => open(net)}
            aria-label={compact ? `Share on ${label}` : undefined}
          >
            {icon}
            {!compact && label}
          </button>
        ))}
        {copyButton}
        {nativeButton}
      </div>
      <output className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard." : ""}
      </output>
    </div>
  );
}
