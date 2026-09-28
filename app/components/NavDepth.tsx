"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** sessionStorage key: how many in-site page changes this tab has made. */
export const NAV_DEPTH_KEY = "embarko-nav-depth";

/**
 * Counts page changes inside the site for this tab, so a "Back" control can
 * tell whether going back stays on Embarko. Client-side navigation doesn't
 * update document.referrer, which is why this exists. A fresh load from
 * outside the site starts the count at zero.
 */
export function NavDepth() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    try {
      if (first.current) {
        first.current = false;
        let fromSite = false;
        try {
          fromSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
        } catch {}
        if (!fromSite) sessionStorage.setItem(NAV_DEPTH_KEY, "0");
        else sessionStorage.setItem(NAV_DEPTH_KEY, String(Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? 0) + 1));
        return;
      }
      sessionStorage.setItem(NAV_DEPTH_KEY, String(Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? 0) + 1));
    } catch {
      /* Storage blocked: Back just falls back to the Showcase link. */
    }
  }, [pathname]);

  return null;
}
