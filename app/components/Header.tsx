"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

import { trackCTA } from "../lib/tracking";

/** An in-page anchor shown in the header's centre slot. */
export interface HeaderLink {
  href: string;
  label: string;
}

interface HeaderProps {
  /** Opens the shared login/signup modal. Each page owns its own modal instance
   *  and passes the trigger down, so there's never more than one mounted at once. */
  onAuthClick: () => void;
  /** Optional in-page section anchors for the centre of the bar. Pages with
   *  long scrolling content (v3) use these; the shorter variants omit them and
   *  the slot collapses, leaving the wordmark/actions layout untouched. */
  links?: readonly HeaderLink[];
}

/** How far the page must scroll before the bar frosts over. Small enough that
 *  the glass is already there by the time content reaches the bar. */
const FROST_AFTER_PX = 8;

/** Matches Tailwind's `lg`. Above this the full bar fits; below it, a page with
 *  section anchors collapses them into the menu. */
const LG_PX = 1024;

const NAV_LINK = "text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950";

export function Header({ onAuthClick, links }: HeaderProps) {
  /* The bar is fixed and transparent, so scrolled content runs straight under
     the wordmark and links and turns them to mush. Frosting it on scroll keeps
     the header legible over anything without putting a permanent slab at the
     top of pages whose hero is designed to start clean. */
  const [frosted, setFrosted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Only pages that pass anchors get a menu. Without it the variants that don't
     (v1/v2/v4) would gain a hamburger they have no use for, changing a mobile
     header that is deliberately just wordmark + Sign up. */
  const hasLinks = Boolean(links && links.length > 0);

  useEffect(() => {
    /* Read once on mount too: a load that restores scroll, or lands on an
       #anchor, starts part-way down the page. */
    const sync = () => setFrosted(window.scrollY > FROST_AFTER_PX);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    /* Widening past lg restores the full bar, which would otherwise leave an
       orphaned panel open below a header that no longer has a toggle. */
    const onResize = () => window.innerWidth >= LG_PX && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  /* An open panel needs a ground of its own even at scroll 0, where the bar is
     otherwise transparent. */
  const solid = frosted || menuOpen;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        solid
          ? /* Without backdrop-filter the translucency alone would leave text
               sitting on whatever scrolls past, so those browsers get the
               near-opaque tint instead. Both tints are tokens: Tailwind cannot
               build an alpha from an arbitrary var() colour, so the /70 form
               silently produces no background at all. */
            "border-b border-[var(--line)] bg-[var(--bg-glass-solid)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--bg-glass)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="flex h-16 w-full items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-neutral-950">
          {/* Plain img: the mark is a static SVG, so next/image would add a
              wrapper and an optimiser pass for nothing. */}
          <img src="/assets/embarko-icon.svg" alt="" aria-hidden="true" className="size-5 rounded" />
          Embarko
        </Link>

        {/* lg, not md: below ~1024px the centre anchors and the Pricing/Docs/
            Log in/Sign up group have no room to coexist and collide. */}
        {hasLinks && (
          <div className="hidden items-center gap-8 lg:flex">
            {links!.map((link) => (
              <a key={link.href} href={link.href} className={NAV_LINK}>
                {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6">
          {/* With anchors in play everything folds into the menu below lg, so
              these three stay hidden until then; without anchors the bar is
              short enough to keep showing them from sm, as it always has. */}
          <Link href="/pricing" className={`hidden ${NAV_LINK} ${hasLinks ? "lg:block" : "sm:block"}`}>
            Pricing
          </Link>
          <Link href="/docs" className={`hidden ${NAV_LINK} ${hasLinks ? "lg:block" : "sm:block"}`}>
            Docs
          </Link>
          <button
            type="button"
            /* Both auth buttons open the same modal, so the only place the
               dashboard's login/signup split can come from is which one was
               pressed. Tracked here rather than in each variant: all four
               share this header. */
            onClick={() => { trackCTA('login'); onAuthClick(); }}
            className={`hidden ${NAV_LINK} ${hasLinks ? "lg:block" : "sm:block"}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { trackCTA('signup'); onAuthClick(); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            Sign up <ArrowRight className="h-3.5 w-3.5" />
          </button>

          {hasLinks && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="header-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-black/[0.04] hover:text-neutral-950 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {hasLinks && (
        <div
          id="header-menu"
          hidden={!menuOpen}
          className="border-t border-[var(--line)] bg-[var(--bg)] px-6 py-4 lg:hidden"
        >
          <div className="flex flex-col">
            {links!.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-[var(--line)] py-3 text-[15px] font-medium text-neutral-700 last:border-b-0 hover:text-neutral-950"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="border-t border-[var(--line)] py-3 text-[15px] font-medium text-neutral-700 hover:text-neutral-950"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              onClick={() => setMenuOpen(false)}
              className="border-t border-[var(--line)] py-3 text-[15px] font-medium text-neutral-700 hover:text-neutral-950"
            >
              Docs
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                trackCTA('login');
                onAuthClick();
              }}
              className="border-t border-[var(--line)] py-3 text-left text-[15px] font-medium text-neutral-700 hover:text-neutral-950"
            >
              Log in
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
