"use client";

import { useEffect, useState } from "react";
import { CONNECTOR_PENDING_REDIRECT_KEY, CONNECTOR_PENDING_STATE_KEY } from "../../lib/connectorPendingRedirect";
import { ConnectorRedirecting, destinationHost } from "./ConnectorRedirecting";

// MSG91's "redirect" mode for the connector's referenceId is configured on
// MSG91's own dashboard to always land the browser on this site's root,
// appending proxy_auth_token as a query param there - regardless of where
// the widget was actually embedded (see connector/login/page.tsx's own
// comment). That page stashes the caller's redirect_uri/state before
// handing off to the widget specifically so this component - mounted once
// in the root layout, so it runs on every page, including wherever MSG91
// actually redirects to - can pick the flow back up: if a proxy_auth_token
// shows up in the URL AND there's a pending connector redirect waiting,
// forward to the same-origin bridge instead of treating this as a normal
// dashboard visit.
//
// Uses localStorage, not sessionStorage: the widget's verification step
// very plausibly runs in a popup/new window (common for these embeds), and
// where it lands with the token in tow may be a *different* top-level
// browsing context than the tab that set this - sessionStorage is scoped
// per-tab and wouldn't be visible there, localStorage is shared across
// every tab/window of the same origin.
const DEBUG = false; // Flip on locally to trace the hand-off; it logs the redirect target.
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log("[ConnectorTokenPickup]", ...args);
}

export function ConnectorTokenPickup() {
  /* Where the hand-off is heading, once one is under way. MSG91 drops the
     browser on whatever page it likes (usually the home page), so without
     this the person watches the marketing site for a few seconds. */
  const [forwardingTo, setForwardingTo] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("proxy_auth_token");
    debugLog("mounted on", window.location.href, "token present:", !!token);
    if (!token) return;

    let redirectUri: string | null;
    let state: string | null;
    try {
      redirectUri = localStorage.getItem(CONNECTOR_PENDING_REDIRECT_KEY);
      state = localStorage.getItem(CONNECTOR_PENDING_STATE_KEY);
      debugLog("read pending redirect:", redirectUri, "state:", state);
    } catch (err) {
      debugLog("localStorage read failed:", err);
      return;
    }
    if (!redirectUri) {
      debugLog("no pending redirect found - leaving this page alone");
      return;
    }

    try {
      localStorage.removeItem(CONNECTOR_PENDING_REDIRECT_KEY);
      localStorage.removeItem(CONNECTOR_PENDING_STATE_KEY);
    } catch {
      // ignore
    }

    const bridge = new URL("/api/auth/connector-callback", window.location.origin);
    bridge.searchParams.set("proxy_auth_token", token);
    bridge.searchParams.set("redirect_uri", redirectUri);
    if (state) bridge.searchParams.set("state", state);
    debugLog("forwarding to bridge:", bridge.toString());
    setForwardingTo(destinationHost(redirectUri));
    window.location.replace(bridge.toString());
  }, []);

  if (forwardingTo === undefined) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background p-6">
      <div className="w-full max-w-[420px] border border-border bg-card p-7">
        <div className="flex items-center gap-3">
          {/* The same static mark the site header uses. */}
          <img src="/assets/embarko-icon.svg" alt="" aria-hidden="true" className="size-8 shrink-0 rounded" />
          <div className="text-[1.15rem] font-extrabold tracking-tight text-foreground">Almost there</div>
        </div>
        <ConnectorRedirecting host={forwardingTo} />
      </div>
    </div>
  );
}
