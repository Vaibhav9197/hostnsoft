"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_DEPTH_KEY } from "../components/NavDepth";

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

/**
 * "← Back" when the visitor arrived from another page on this site, so it
 * returns them exactly where they were (a filtered gallery, another app).
 * Otherwise — a shared link, a search result, a new tab — "← Showcase",
 * because going back would leave the site.
 *
 * Renders the Showcase link on the server and switches after mount: history
 * doesn't exist during server rendering.
 */
export function BackLink() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    /* Deferred a tick: NavDepth sits in the root layout, and a parent's
       effect runs after its children's, so read once it has counted this
       page. */
    const id = window.setTimeout(() => {
      let depth = 0;
      try {
        depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? 0);
      } catch {
        /* Storage blocked: show the Showcase link. */
      }
      setCanGoBack(depth > 0 && window.history.length > 1);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (canGoBack) {
    return (
      <button type="button" className="sc-back" onClick={() => router.back()}>
        <Arrow />
        Back
      </button>
    );
  }
  return (
    <Link href="/showcase" className="sc-back">
      <Arrow />
      Showcase
    </Link>
  );
}
