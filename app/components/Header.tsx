"use client";

import { useEffect, useState } from "react";
import { GetAccessButton } from "./EarlyAccess";

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
        <div className="brand">
          <span className="logo"><span></span></span>
          AppHome
        </div>
        <GetAccessButton />
      </div>
    </header>
  );
}
