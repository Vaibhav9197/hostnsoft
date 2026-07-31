"use client";

import { useEffect, useState } from "react";
import { GetAccessButton } from "./EarlyAccess";
import { Logo } from "./Logo";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "scrolled" : ""}>
      <div className="wrap nav">
        <Logo />
        <GetAccessButton />
      </div>
    </header>
  );
}
