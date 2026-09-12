"use client";

import { useEffect } from "react";
import { CONNECTOR_PENDING_REDIRECT_KEY, CONNECTOR_PENDING_STATE_KEY } from "../../lib/connectorPendingRedirect";

// MSG91's "redirect" mode for the connector's referenceId is configured on
// MSG91's own dashboard to always land the browser on this site's root,
// appending proxy_auth_token as a query param there - regardless of where
// the widget was actually embedded (see connector/login/page.tsx's own
// comment). That page stashes the caller's redirect_uri/state in
// sessionStorage before handing off to the widget specifically so this
// component - mounted once in the root layout, so it runs on every page,
// including wherever MSG91 actually redirects to - can pick the flow back
// up: if a proxy_auth_token shows up in the URL AND there's a pending
// connector redirect waiting, forward to the same-origin bridge instead of
// treating this as a normal dashboard visit.
export function ConnectorTokenPickup() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("proxy_auth_token");
    if (!token) return;

    let redirectUri: string | null;
    let state: string | null;
    try {
      redirectUri = sessionStorage.getItem(CONNECTOR_PENDING_REDIRECT_KEY);
      state = sessionStorage.getItem(CONNECTOR_PENDING_STATE_KEY);
    } catch {
      return;
    }
    if (!redirectUri) return;

    try {
      sessionStorage.removeItem(CONNECTOR_PENDING_REDIRECT_KEY);
      sessionStorage.removeItem(CONNECTOR_PENDING_STATE_KEY);
    } catch {
      // ignore
    }

    const bridge = new URL("/api/auth/connector-callback", window.location.origin);
    bridge.searchParams.set("proxy_auth_token", token);
    bridge.searchParams.set("redirect_uri", redirectUri);
    if (state) bridge.searchParams.set("state", state);
    window.location.replace(bridge.toString());
  }, []);

  return null;
}
