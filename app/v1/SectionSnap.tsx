"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Kbd, KbdGroup } from "@/app/components/ui/kbd";

/**
 * One-section-per-gesture scrolling for the v1 landing page, plus the sticky
 * up/down keys that do the same thing by click.
 *
 * Each scene is a full-height <section>, so a scroll gesture advances to the
 * next scene rather than moving by pixels.
 *
 * Two deliberate constraints:
 *
 *  - A section taller than the viewport (long content, small screens) is NOT
 *    hijacked until it has been read to its edge. Otherwise the gesture would
 *    skip past content that is still off-screen.
 *  - Keyboard and reduced-motion users get the same navigation without the
 *    animation, since hijacked scrolling is disorienting when motion is
 *    unwelcome and unusable if only the wheel is wired up.
 */

/* Long enough for the smooth scroll to land before another gesture is taken,
   short enough that a deliberate second swipe still feels responsive. */
const SETTLE_MS = 780;
/* Wheel deltas below this are trackpad drift/inertia, not an intent to move. */
const WHEEL_THRESHOLD = 12;
/* Slack when deciding "is this section scrolled to its edge?" — sub-pixel
   layout and browser zoom mean an exact comparison never quite lands. */
const EDGE_SLACK = 4;

export function SectionSnap({
  containerSelector,
  offsetSelector,
}: {
  containerSelector: string;
  /** Sticky chrome overlaying the top of the page (the site header). Its height
      is added to the edge tolerance: a full-height section sits *under* that
      chrome, so without this every section looks like it has content still
      below the fold and nothing ever snaps. */
  offsetSelector?: string;
}) {
  const [count, setCount] = useState(0);

  const sectionsRef = useRef<Element[]>([]);
  /* Section offsets are measured on mount and on resize, never mid-gesture:
     reading getBoundingClientRect() while a scroll is still settling yields a
     target a few pixels off, leaving the snap visibly short of the edge. */
  const topsRef = useRef<number[]>([]);
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const advanceRef = useRef<(direction: 1 | -1) => boolean>(() => false);

  const goTo = useCallback((next: number) => {
    const tops = topsRef.current;
    if (next < 0 || next >= tops.length) return;
    lockedRef.current = true;
    window.clearTimeout(unlockTimerRef.current);
    window.scrollTo({
      top: tops[next],
      behavior: reducedMotionRef.current ? "auto" : "smooth",
    });
    unlockTimerRef.current = window.setTimeout(
      () => {
        lockedRef.current = false;
      },
      reducedMotionRef.current ? 0 : SETTLE_MS,
    );
  }, []);

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const sections = Array.from(container.querySelectorAll(":scope > section"));
    if (sections.length < 2) return;

    sectionsRef.current = sections;
    setCount(sections.length);
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const offsetEl = offsetSelector ? document.querySelector(offsetSelector) : null;
    const chromeHeight = () => (offsetEl instanceof HTMLElement ? offsetEl.offsetHeight : 0);

    const betaBarHeight = () =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--beta-bar-h")) || 0;

    function measure() {
      topsRef.current = sections.map((section) =>
        /* Land each section just below the fixed beta bar, not under it. */
        Math.round(section.getBoundingClientRect().top + window.scrollY - betaBarHeight()),
      );
    }
    measure();

    /* The section occupying most of the viewport is the one we're "on" —
       more stable mid-animation than measuring against the top edge. */
    function currentIndex() {
      const chrome = chromeHeight();
      let best = 0;
      let bestVisible = -1;
      sections.forEach((section, i) => {
        const { top, bottom } = section.getBoundingClientRect();
        const visible = Math.min(bottom, window.innerHeight) - Math.max(top, chrome);
        if (visible > bestVisible) {
          bestVisible = visible;
          best = i;
        }
      });
      return best;
    }

    /* True when the current section still has content to reveal in `direction`,
       in which case the browser's own scrolling should handle it. */
    function hasRoomToScroll(i: number, direction: 1 | -1) {
      const { top, bottom } = sections[i].getBoundingClientRect();
      const slack = EDGE_SLACK + chromeHeight();
      return direction === 1 ? bottom > window.innerHeight + slack : top < -slack;
    }

    function advance(direction: 1 | -1) {
      const i = currentIndex();
      if (hasRoomToScroll(i, direction)) return false;
      const next = i + direction;
      if (next < 0 || next >= sections.length) return false;
      goTo(next);
      return true;
    }
    advanceRef.current = advance;

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return; // pinch-zoom, not a scroll
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
      if (lockedRef.current) {
        event.preventDefault();
        return;
      }
      const direction = event.deltaY > 0 ? 1 : -1;
      if (hasRoomToScroll(currentIndex(), direction)) return; // let the browser scroll
      if (advance(direction)) event.preventDefault();
    }

    let touchStartY = 0;
    function onTouchStart(event: TouchEvent) {
      touchStartY = event.touches[0].clientY;
    }
    function onTouchEnd(event: TouchEvent) {
      if (lockedRef.current) return;
      const delta = touchStartY - event.changedTouches[0].clientY;
      if (Math.abs(delta) < 50) return; // a tap or a nudge, not a swipe
      advance(delta > 0 ? 1 : -1);
    }

    const FORWARD_KEYS = ["ArrowDown", "PageDown", " "];
    const BACK_KEYS = ["ArrowUp", "PageUp"];
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && target.closest("input, textarea, select, [contenteditable]")) return;
      if (lockedRef.current) return;

      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(sections.length - 1);
      } else if (FORWARD_KEYS.includes(event.key)) {
        if (advance(1)) event.preventDefault();
      } else if (BACK_KEYS.includes(event.key)) {
        if (advance(-1)) event.preventDefault();
      }
    }

    // preventDefault on wheel requires a non-passive listener.
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", measure);

    return () => {
      /* Clearing the timer without dropping the lock strands the component:
         if the effect re-runs mid-animation (a resize, a hot reload), the
         pending unlock never fires and every later gesture is swallowed. */
      window.clearTimeout(unlockTimerRef.current);
      lockedRef.current = false;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", measure);
    };
  }, [containerSelector, offsetSelector, goTo]);

  if (count < 2) return null;

  /* Clicking a key does exactly what pressing it does — same `advance`, so the
     tall-section guard and the settle lock apply either way. The lock check
     also stops Space-on-a-focused-key from advancing twice: once via keydown,
     once via the click it synthesises. */
  function step(direction: 1 | -1) {
    if (lockedRef.current) return;
    advanceRef.current(direction);
  }

  const keyButton = "cursor-pointer rounded-[6px] transition hover:brightness-95 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-v1)]";

  return (
    /* Hidden on phones. These are pictures of keyboard keys, and a phone has no
       keyboard — the touch handler above already advances on swipe, so nothing
       is lost. Kept visible they overlap the bottom of every scene, which on a
       short screen means sitting on top of the copy. */
    <KbdGroup className="pointer-events-auto fixed inset-x-0 bottom-6 z-50 hidden justify-center sm:flex">
      <button type="button" className={keyButton} onClick={() => step(-1)} aria-label="Previous scene">
        <Kbd>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </Kbd>
      </button>
      <button type="button" className={keyButton} onClick={() => step(1)} aria-label="Next scene">
        <Kbd>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </Kbd>
      </button>
    </KbdGroup>
  );
}
