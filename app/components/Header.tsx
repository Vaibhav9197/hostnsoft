"use client";

import { useCallback, useEffect, useState } from "react";
import { GetAccessButton } from "./EarlyAccess";
import { Logo } from "./Logo";
import { LoginModal } from "./LoginModal";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openLogin = useCallback(() => {
    if (typeof window.initVerification !== "function") {
      console.warn("Auth widget is still loading — please try again in a moment.");
      return;
    }
    setLoginOpen(true);
  }, []);

  return (
    <>
      <header className={scrolled ? "scrolled" : ""}>
        <div className="wrap nav">
          <Logo />
          <div className="nav-actions">
            <button type="button" className="btn-ghost" onClick={openLogin}>
              Login
            </button>
            <GetAccessButton />
          </div>
        </div>
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
