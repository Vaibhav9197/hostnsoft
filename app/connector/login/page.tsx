"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "../../components/console/kit";
import { CONNECTOR_PENDING_REDIRECT_KEY, CONNECTOR_PENDING_STATE_KEY } from "../../lib/connectorPendingRedirect";

// Login entry point for AI-connector OAuth flows (e.g. a generic MCP OAuth
// proxy redirecting a user here with its own redirect_uri/state, the way it
// would redirect to any other platform's login page).
//
// Deliberately separate from LoginScreen.tsx: that screen is wired into the
// dashboard's own session (Option B - the widget's success callback POSTs
// straight to /auth/msg91/exchange, and its redirect_path is hardcoded to
// /app). This page instead uses "Option A" - once the widget hands us a
// token, we navigate the browser to /auth/msg91/callback (via the
// same-origin bridge at /api/auth/connector-callback, see that route's own
// comment) with the CALLER's redirect_uri/state, so hostnsoft-api's existing
// allowlist + `code`/`state` forwarding logic (auth.routes.ts) does the rest.
// No local session/cookie is created by this page - the caller is a
// third-party server, not this dashboard.
const REFERENCE_ID =
  process.env.NEXT_PUBLIC_MSG91_REFERENCE_ID || "117230j17876397376a8d37b972ce7";
const WIDGET_SRC =
  process.env.NEXT_PUBLIC_MSG91_WIDGET_SCRIPT ||
  "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";

// Fallback for when MSG91's own "redirect" mode fires instead of (or in
// addition to) the in-page success callback below - it's configured against
// this referenceId on MSG91's own dashboard and always lands the browser on
// this site's root ("/"), not wherever the widget was actually embedded, and
// that target isn't something a query param here can override. So before
// handing off to the widget, stash what the eventual redirect needs in
// localStorage (shared across tabs/windows of this origin - the widget's
// verification step plausibly runs in a popup, a different top-level
// browsing context than this tab, so sessionStorage wouldn't be visible
// there) - see ConnectorTokenPickup.tsx, mounted in the root layout, which
// looks for these on every page load and finishes the handoff if MSG91
// dropped the browser somewhere unexpected with a token in tow.
const DEBUG = true; // TEMPORARY - remove once this flow is confirmed working live.
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log("[ConnectorLogin]", ...args);
}

function ConnectorLoginInner() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!redirectUri || !REFERENCE_ID || started.current) return;
    started.current = true;
    const targetRedirectUri = redirectUri;

    try {
      localStorage.setItem(CONNECTOR_PENDING_REDIRECT_KEY, targetRedirectUri);
      if (state) localStorage.setItem(CONNECTOR_PENDING_STATE_KEY, state);
      else localStorage.removeItem(CONNECTOR_PENDING_STATE_KEY);
      debugLog("stashed pending redirect:", targetRedirectUri, "state:", state);
    } catch (err) {
      // Private browsing / storage disabled - the in-page success callback
      // below still works fine on its own in that case, this is only a
      // fallback for MSG91's separate redirect-mode behavior.
      debugLog("localStorage write failed:", err);
    }

    function boot() {
      debugLog("booting widget, initVerification available:", typeof window.initVerification === "function");
      if (typeof window.initVerification !== "function") {
        setError("The login widget could not be loaded. Check your connection and reload.");
        return;
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
      window.initVerification({
        referenceId: REFERENCE_ID,
        type: "authorization",
        theme: "light",
        // No addInfo.redirect_path here (unlike LoginScreen) - this page
        // handles the redirect itself via the success callback below, so
        // there's no dashboard-relative path for the widget to fall back to.
        success: (data: unknown) => {
          debugLog("widget success callback fired with:", data);
          const token =
            (data as { token?: string; proxy_auth_token?: string })?.token ??
            (data as { proxy_auth_token?: string })?.proxy_auth_token;
          if (!token) {
            setError("The login widget didn't return a token. Please try again.");
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
          bridge.searchParams.set("redirect_uri", targetRedirectUri);
          if (state) bridge.searchParams.set("state", state);
          debugLog("in-page success path forwarding to bridge:", bridge.toString());
          window.location.href = bridge.toString();
        },
        failure: (err: unknown) => {
          debugLog("widget failure callback fired with:", err);
          console.warn("MSG91 verification failed", err);
          setError("Verification was cancelled or failed. Please try again.");
        },
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`);
    if (existing && typeof window.initVerification === "function") {
      boot();
    } else if (existing) {
      existing.addEventListener("load", boot, { once: true });
    } else {
      const s = document.createElement("script");
      s.src = WIDGET_SRC;
      s.async = true;
      s.addEventListener("load", boot, { once: true });
      s.addEventListener("error", () =>
        setError("The login widget could not be loaded. Check your connection and reload."),
      );
      document.head.appendChild(s);
    }
  }, [redirectUri, state]);

  if (!redirectUri) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-[420px] border border-border bg-card p-7">
          <Alert variant="err">Missing redirect_uri. This page must be reached via an AI client's OAuth redirect, not visited directly.</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-[420px] border border-border bg-card p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center bg-primary text-base font-extrabold text-primary-foreground" aria-hidden="true">H</span>
          <div>
            <div className="text-[1.15rem] font-extrabold tracking-tight text-foreground">Sign in to Embarko</div>
            <div className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-primary">Connecting an AI client</div>
          </div>
        </div>

        {error && <Alert variant="err" className="mt-4">{error}</Alert>}

        <p className="mt-3 text-[0.92rem] text-muted-foreground">
          Verify your email to continue. You'll be sent back to the app you connected from.
        </p>
        <div id={REFERENCE_ID} ref={containerRef} className="login-widget mt-3" />
      </div>
    </div>
  );
}

export default function ConnectorLoginPage() {
  return (
    <Suspense fallback={null}>
      <ConnectorLoginInner />
    </Suspense>
  );
}
