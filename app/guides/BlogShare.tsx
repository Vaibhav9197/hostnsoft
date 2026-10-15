"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Link2, Mail, Share2, X as Close } from "lucide-react";
import { siFacebook, siReddit, siTelegram, siWhatsapp, siX } from "simple-icons";

/**
 * The share launcher for a guide: one "Share" button that opens a panel with
 * every app in it. The page URL is read from the browser when an app is
 * picked, so a cached page never shares the host that built it.
 *
 * Self-contained on purpose: the guides do not borrow code from other parts
 * of the site.
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

const pageUrl = () => window.location.href.split("#")[0];

const Brand = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
);

/* LinkedIn left simple-icons at the company's request; this is the same mark
   the Showcase draws. */
const LinkedInIcon = () => (
  <Brand path="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
);

const NETS: { net: Net; label: string; icon: React.ReactNode }[] = [
  { net: "linkedin", label: "LinkedIn", icon: <LinkedInIcon /> },
  { net: "whatsapp", label: "WhatsApp", icon: <Brand path={siWhatsapp.path} /> },
  { net: "x", label: "X", icon: <Brand path={siX.path} /> },
  { net: "facebook", label: "Facebook", icon: <Brand path={siFacebook.path} /> },
  { net: "reddit", label: "Reddit", icon: <Brand path={siReddit.path} /> },
  { net: "telegram", label: "Telegram", icon: <Brand path={siTelegram.path} /> },
  { net: "email", label: "Email", icon: <Mail aria-hidden="true" /> },
];

const TILE =
  "flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl px-1 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-neutral-950";
const DOT =
  "grid size-11 place-items-center rounded-full border border-[var(--line-control)] bg-[var(--surface)] text-neutral-950 [&_svg]:size-[18px]";

/**
 * `align` decides which edge of the button the panel lines up with, so it
 * never runs off the side it sits against.
 */
export function BlogShare({ title, align = "left" }: { title: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    setCanNative(typeof navigator.share === "function");
  }, []);

  /* Close on Escape or a click outside; on open, focus the first app so the
     keyboard lands inside the panel. */
  useEffect(() => {
    if (!open) return;
    const first = wrap.current?.querySelector<HTMLElement>("[data-share-item]");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const pick = (net: Net) => {
    const href = shareHref(net, title, pageUrl());
    if (net === "email") window.location.href = href;
    else window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard refused (insecure origin or denied): the link is still in
         the address bar, so stay quiet rather than raise an error. */
    }
  };

  return (
    <div ref={wrap} className="relative inline-block">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line-control)] bg-[var(--surface)] px-5 text-sm font-semibold text-neutral-950 transition-colors hover:border-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
      >
        <Share2 className="size-4" aria-hidden="true" />
        Share
      </button>

      {open && (
        /* Phones: a dimmed backdrop and a sheet along the bottom edge, so the
           panel can never run off the screen. From sm up: a dropdown under
           the button. */
        <div aria-hidden="true" className="fixed inset-0 z-40 bg-neutral-950/20 sm:hidden" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Share this guide"
          className={`fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 rounded-2xl border border-neutral-200 bg-[var(--surface)] p-4 shadow-[0_2px_4px_rgba(11,11,15,.04),0_30px_70px_-20px_rgba(20,18,16,.25)] motion-safe:animate-[share-pop_.16s_ease-out] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:z-30 sm:mt-2 sm:w-[22rem] ${
            align === "right" ? "sm:right-0" : "sm:left-0"
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-neutral-950">Share this guide</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
            >
              <Close className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1">
            {NETS.map(({ net, label, icon }) => (
              <button key={net} type="button" data-share-item onClick={() => pick(net)} className={TILE}>
                <span className={DOT}>{icon}</span>
                {label}
              </button>
            ))}
            <button type="button" data-share-item onClick={copy} className={TILE}>
              <span className={DOT}>{copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}</span>
              {copied ? "Copied" : "Copy link"}
            </button>
            {canNative && (
              <button
                type="button"
                data-share-item
                onClick={() => {
                  navigator.share({ title, url: pageUrl() }).catch(() => {});
                  setOpen(false);
                }}
                className={TILE}
              >
                <span className={DOT}>
                  <Share2 aria-hidden="true" />
                </span>
                More
              </button>
            )}
          </div>

          <output className="sr-only" aria-live="polite">
            {copied ? "Link copied to clipboard." : ""}
          </output>
        </div>
      )}

      {/* The panel's entrance, scoped here so no global stylesheet changes. */}
      <style>{`@keyframes share-pop{from{opacity:0;transform:translateY(-4px) scale(.97)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
