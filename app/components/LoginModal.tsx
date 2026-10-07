"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { authExchange, authMe, markExchanged, wasExchanged } from "../lib/client";
import "./LoginModal.css";

/**
 * MSG91 proxy-auth reference id. The widget renders itself into a DOM element
 * whose id matches this value.
 */
const REFERENCE_ID = "117230j17876397376a8d37b972ce7";

declare global {
  interface Window {
    initVerification?: (config: unknown) => void;
  }
}

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  /** Where MSG91 sends the user after a successful login. Defaults to /app. */
  redirectPath?: string;
}

/**
 * Login dialog for both the landing page and the console header.
 *
 * The MSG91 script is loaded via next/script (deduped by src) so mounting this
 * from multiple places is safe. `open` controls visibility; the widget is
 * (re)rendered whenever the dialog transitions to open.
 */
export function LoginModal({ open, onClose, redirectPath = "/app" }: LoginModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Callers often pass an inline `() => ...` for onClose, which gets a new
  // identity on every render. Route through a ref so the effects below only
  // re-run when `open`/`redirectPath` actually change, not on every parent
  // re-render (the landing page re-renders continuously via its hero timer).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // "checking": asking the BFF whether a session already exists.
  // "redirecting": it does — we're on our way to the console, skip the widget.
  // "widget": no session — show the MSG91 login form.
  const [phase, setPhase] = useState<"checking" | "redirecting" | "widget">("checking");
  const [error, setError] = useState<string | null>(null);

  // When the dialog opens, first check for an existing session. A visitor who
  // is already logged in (e.g. came back to the landing page) shouldn't be
  // asked to log in again — send them straight to the console instead.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase("checking");
    authMe()
      .then(() => {
        if (cancelled) return;
        setPhase("redirecting");
        window.location.assign(redirectPath);
      })
      .catch(() => {
        if (!cancelled) setPhase("widget");
      });
    return () => {
      cancelled = true;
    };
  }, [open, redirectPath]);

  // Once we know there's no session, render the MSG91 widget into the container.
  useEffect(() => {
    if (!open || phase !== "widget") return;
    if (typeof window.initVerification !== "function") {
      console.warn("Auth widget is still loading — please try again in a moment.");
      return;
    }

    // Clear any previous render so re-opening starts fresh.
    if (containerRef.current) containerRef.current.innerHTML = "";

    window.initVerification({
      referenceId: REFERENCE_ID,
      type: "authorization",
      addInfo: { redirect_path: redirectPath },
      /* The widget hands the verified token here when it doesn't redirect
         (e.g. Google in a popup). Closing the dialog alone left the visitor
         on the same page, still signed out — so turn the token into a
         session, then go where the dialog was opened for. */
      success: async (data: unknown) => {
        const token =
          (data as { token?: string; proxy_auth_token?: string })?.token ??
          (data as { proxy_auth_token?: string })?.proxy_auth_token;
        if (!token) {
          setError("Sign-in didn’t finish. Please try again.");
          return;
        }
        setError(null);
        setPhase("redirecting");
        try {
          // Single-use: the redirect variant may already have spent it.
          if (!wasExchanged(token)) {
            markExchanged(token);
            await authExchange(token);
          }
          window.location.assign(redirectPath);
        } catch (e) {
          setPhase("widget");
          setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
        }
      },
      failure: (err: unknown) => {
        console.warn("MSG91 verification failed", err);
        setError("Sign-in was cancelled or failed. Please try again.");
      },
      theme: "light"
    });
  }, [open, phase, redirectPath]);

  // Lock scroll + Escape to close.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Script
        src="https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js"
        strategy="afterInteractive"
      />
      <div className="login-modal-root">
        <div
          className={`lm-overlay${open ? " open" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="lm-modal" role="dialog" aria-modal="true" aria-label="Log in to Embarko">
            <button className="lm-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            {phase === "widget" ? (
              <>
                <h3 className="lm-title">Log in</h3>
                <p className="lm-sub">Sign in to your Embarko account to manage and deploy your apps.</p>
              </>
            ) : (
              <>
                <h3 className="lm-title">{phase === "redirecting" ? "Welcome back" : "One moment"}</h3>
                <p className="lm-sub">
                  {phase === "redirecting" ? "You’re signed in — taking you there now." : "Checking your session…"}
                </p>
              </>
            )}
            <div id={REFERENCE_ID} ref={containerRef} className="lm-widget" hidden={phase !== "widget"} />
            {error && phase === "widget" && (
              <p className="lm-sub" role="alert" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
