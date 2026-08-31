"use client";

import { useEffect, useRef, useState } from "react";
import { authExchange, markExchanged, wasExchanged } from "../../lib/client";
import { useSession } from "../../lib/session";

// MSG91 proxy-auth login.
//
// The proxy-auth widget delivers the one-time proxy_auth_token to a REQUIRED
// `success` callback (it throws "success callback function missing" without
// one). We take that token and hand it to hostnsoft-api's exchange endpoint via
// the BFF (POST /auth/msg91/exchange), which verifies it with MSG91 server-side
// — using the secret authkey and routes.msg91.com/generateAuthToken — and
// returns a hostnsoft session (access token + httpOnly refresh cookie).
//
// SessionProvider ALSO handles the redirect variant (token appended to the URL)
// as a safety net, so login works whichever way the MSG91 feature is configured.
//
// The widget renders into the DOM element whose id === referenceId.
// window.initVerification is declared globally in app/components/Header.tsx.
const REFERENCE_ID =
  process.env.NEXT_PUBLIC_MSG91_REFERENCE_ID ?? "117230j17876397376a8d37b972ce7";
const WIDGET_SRC =
  process.env.NEXT_PUBLIC_MSG91_WIDGET_SCRIPT ??
  "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";

export function LoginScreen() {
  const { authError, reload } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!REFERENCE_ID || started.current) return;
    started.current = true;

    function boot() {
      if (typeof window.initVerification !== "function") {
        setError("The login widget could not be loaded. Check your connection and reload.");
        return;
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
      window.initVerification({
        referenceId: REFERENCE_ID,
        type: "authorization",
        // Redirect variant: MSG91 lands back on /app with the token appended;
        // SessionProvider consumes it. Works alongside the success callback.
        addInfo: {
          redirect_path: "/app",
        },
        // Required by the widget: it delivers the verified token here.
        success: async (data: unknown) => {
          const token =
            (data as { token?: string; proxy_auth_token?: string })?.token ??
            (data as { proxy_auth_token?: string })?.proxy_auth_token;
          if (!token) {
            setError("The login widget didn’t return a token. Please try again.");
            return;
          }
          // The token is single-use; if the redirect flow already spent it,
          // just refresh the session rather than exchanging again.
          if (wasExchanged(token)) {
            await reload();
            return;
          }
          markExchanged(token);
          setBusy(true);
          setError(null);
          try {
            await authExchange(token);
            await reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
            setBusy(false);
          }
        },
        failure: (err: unknown) => {
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
  }, [reload]);

  const configured = Boolean(REFERENCE_ID);

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="con-ws-mark" aria-hidden="true">H</span>
          <div>
            <div className="login-title">Sign in to hostnsoft</div>
            <div className="login-tag">Deploy console</div>
          </div>
        </div>

        {(error || authError) && (
          <div className="con-alert err" style={{ marginTop: 16 }}>{error ?? authError}</div>
        )}

        {!configured ? (
          <div className="con-alert err" style={{ marginTop: 16 }}>
            Login isn’t configured yet. Set <code>NEXT_PUBLIC_MSG91_REFERENCE_ID</code> (from the
            MSG91 proxy-auth dashboard) to enable sign-in.
          </div>
        ) : (
          <>
            <p className="con-sub" style={{ marginTop: 12 }}>
              Verify your email to continue. You’ll land in your workspace once you’re in.
            </p>
            {/* MSG91 renders the widget into the element whose id === referenceId */}
            <div id={REFERENCE_ID} ref={containerRef} className="login-widget" />
            {busy && <div className="con-alert info" style={{ marginTop: 14 }}>Signing you in…</div>}
          </>
        )}
      </div>
    </div>
  );
}
