"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
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

  // When the dialog opens, render the MSG91 widget into the container.
  useEffect(() => {
    if (!open) return;
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
      success: (data: unknown) => {
        console.log("success response", data);
        onClose();
      },
      failure: (error: unknown) => {
        console.log("failure reason", error);
      },
    });
  }, [open, onClose, redirectPath]);

  // Lock scroll + Escape to close.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

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
          <div className="lm-modal" role="dialog" aria-modal="true" aria-label="Log in to hostnsoft">
            <button className="lm-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <h3 className="lm-title">Log in</h3>
            <p className="lm-sub">Sign in to your hostnsoft account to manage and deploy your apps.</p>
            <div id={REFERENCE_ID} ref={containerRef} className="lm-widget" />
          </div>
        </div>
      </div>
    </>
  );
}
