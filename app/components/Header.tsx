"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { GetAccessButton } from "./EarlyAccess";
import { Logo } from "./Logo";

/**
 * MSG91 proxy-auth reference id. The widget renders itself into a DOM element
 * whose id matches this value, so the login dialog below uses it as its
 * container id and calls window.initVerification() once that container mounts.
 */
const REFERENCE_ID = "117230j17876397376a8d37b972ce7";

declare global {
  interface Window {
    initVerification?: (config: unknown) => void;
  }
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const openLogin = useCallback(() => {
    if (typeof window.initVerification !== "function") {
      console.warn("Auth widget is still loading — please try again in a moment.");
      return;
    }
    setLoginOpen(true);
  }, []);

  // When the dialog opens, (re)render the MSG91 widget into the container.
  useEffect(() => {
    if (!loginOpen) return;
    if (typeof window.initVerification !== "function") return;

    // Clear any previous render so re-opening starts fresh.
    if (containerRef.current) containerRef.current.innerHTML = "";

    window.initVerification({
      referenceId: REFERENCE_ID,
      type: "authorization",
      addInfo: {
        redirect_path: "/app",
      },
      success: (data: unknown) => {
        // get verified token in response
        console.log("success response", data);
        setLoginOpen(false);
      },
      failure: (error: unknown) => {
        // handle error
        console.log("failure reason", error);
      },
    });
  }, [loginOpen]);

  // Lock scroll + close on Escape while the dialog is open.
  useEffect(() => {
    document.body.style.overflow = loginOpen ? "hidden" : "";
    if (!loginOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLoginOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [loginOpen]);

  return (
    <>
      <Script
        src="https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js"
        strategy="afterInteractive"
        onLoad={() => setAuthReady(true)}
      />
      <header className={scrolled ? "scrolled" : ""}>
        <div className="wrap nav">
          <Logo />
          <div className="nav-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={openLogin}
              disabled={!authReady}
            >
              Login
            </button>
            <GetAccessButton />
          </div>
        </div>
      </header>

      {/* Login dialog — MSG91 proxy-auth renders into the #REFERENCE_ID container */}
      <div
        className={`overlay${loginOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeLogin();
        }}
      >
        <div className="modal login-modal" role="dialog" aria-modal="true" aria-label="Log in to hostnsoft">
          <button className="close" onClick={closeLogin} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <h3>Log in</h3>
          <p className="sub">Sign in to your hostnsoft account to manage and deploy your apps.</p>
          <div id={REFERENCE_ID} ref={containerRef} className="login-widget" />
        </div>
      </div>
    </>
  );
}
