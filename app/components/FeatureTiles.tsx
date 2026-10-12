'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FEATURES } from '../lib/features';

/* "Need more? You already have it." — the feature tiles on /v1 and the /v2
   story's last scene. Same list as the tabs on /v3 and /v4 (FeatureShowcase),
   from app/lib/features.ts; this is just the calmer, glanceable view of it:
   tiles first, detail on hover or tap. */

/* The prompts are stored with curly quotes for display; copy the bare words. */
const say = (prompt: string) => prompt.replace(/^[“"]|[”"]$/g, '');

/* Hover opens after a short pause, so sweeping the mouse across the grid
   doesn't flash a bubble on every tile. */
const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 120;
const BUBBLE_W = 288;

type Anchor = { name: string; el: HTMLElement; rect: DOMRect };

/* The bubble over (or under) a tile: what it does, and the sentence you'd say
   to your AI to get it. Fixed-positioned from the tile's rect and kept inside
   the viewport, with a tail pointing back at the tile. */
function NeedBubble({
  anchor,
  closing,
  onEnter,
  onLeave,
}: {
  anchor: Anchor;
  closing: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const n = FEATURES.find((x) => x.id === anchor.name)!;
  const line = n.prompts[0] ? say(n.prompts[0]) : '';
  const [copied, setCopied] = useState(false);
  const { rect } = anchor;
  const vw = window.innerWidth;
  const center = rect.left + rect.width / 2;
  const left = Math.max(12, Math.min(center - BUBBLE_W / 2, vw - BUBBLE_W - 12));
  const below = rect.top < 240;
  const tailX = Math.max(18, Math.min(center - left, BUBBLE_W - 18));
  const pos: React.CSSProperties = below
    ? { left, top: rect.bottom + 12, width: BUBBLE_W, transformOrigin: `${tailX}px top` }
    : { left, bottom: window.innerHeight - rect.top + 12, width: BUBBLE_W, transformOrigin: `${tailX}px bottom` };

  async function copy() {
    if (!line) return;
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked: the sentence is on screen to type instead
    }
  }

  return (
    <div
      id="feature-bubble"
      role="dialog"
      aria-label={n.label}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      data-closing={closing || undefined}
      className="ds-pop fixed z-[300] rounded-[18px] border border-[var(--ds-line)] bg-[var(--ds-card)] p-4 text-left shadow-[var(--ds-sh2)]"
      style={pos}
    >
      <span
        aria-hidden="true"
        className={`ds-pop-tail absolute size-3 rotate-45 border-[var(--ds-line)] bg-[var(--ds-card)] ${below ? '-top-1.5 border-l border-t' : '-bottom-1.5 border-b border-r'}`}
        style={{ left: tailX - 6 }}
      />
      {/* Keyed by tile, so moving to another tile cross-fades the words while
          the bubble itself glides over. */}
      <div key={n.id} className="ds-pop-body">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <n.Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {n.label}
        {n.upcoming && <span className="rounded-full bg-[var(--ds-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-dim)]">Upcoming</span>}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ds-mute)]">{n.body}</p>
      {line && (
        <div className="mt-3 rounded-[12px] bg-[var(--ds-soft)] p-2.5">
          {/* "Say to your AI" over a feature that doesn't exist yet reads as an
              instruction that would fail. */}
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-dim)]">{n.upcoming ? 'Soon you can say' : 'Say to your AI'}</p>
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="text-sm font-medium">&ldquo;{line}&rdquo;</p>
            {!n.upcoming && <button
              type="button"
              onClick={copy}
              aria-label={copied ? 'Copied' : `Copy: ${line}`}
              className="flex-none rounded-md px-1.5 py-0.5 text-xs font-medium text-[var(--ds-mute)] hover:bg-[var(--ds-card)] hover:text-[var(--ds-ink)]"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

/* How long the bubble takes to sink away before it unmounts. */
const CLOSE_ANIM_MS = 160;

/* Tiles stay calm until asked: hover (mouse), tap (touch) or focus
   (keyboard) opens the bubble at the tile. Escape or a tap outside closes
   it. A scroll moves it with its tile (section snap keeps scrolling after
   the wheel stops, so closing on scroll killed hovers) and closes it only
   once the tile leaves the screen. */
export function FeatureTiles() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [closing, setClosing] = useState(false);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);
  const unmountTimer = useRef(0);

  const openFor = (name: string, el: HTMLElement) => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(unmountTimer.current);
    setClosing(false);
    setAnchor({ name, el, rect: el.getBoundingClientRect() });
  };
  /* Plays the sink-away, then unmounts. Opening again mid-way cancels it. */
  const close = () => {
    window.clearTimeout(openTimer.current);
    setClosing(true);
    window.clearTimeout(unmountTimer.current);
    unmountTimer.current = window.setTimeout(() => {
      setAnchor(null);
      setClosing(false);
    }, CLOSE_ANIM_MS);
  };
  const cancelClose = () => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(unmountTimer.current);
    setClosing(false);
  };
  const scheduleClose = () => {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(close, HOVER_CLOSE_MS);
  };

  useEffect(() => {
    if (!anchor) return;
    const follow = () => {
      const rect = anchor.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) close();
      else setAnchor((a) => (a ? { ...a, rect } : a));
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest('#feature-bubble') && !t.closest('[data-feature]')) close();
    };
    window.addEventListener('scroll', follow, { passive: true, capture: true });
    window.addEventListener('resize', follow);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [anchor?.name, anchor?.el]);

  useEffect(() => () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(unmountTimer.current);
  }, []);

  return (
    <div className="w-full">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {FEATURES.map((n) => {
          const on = anchor?.name === n.id && !closing;
          return (
            /* Hover is tracked on the <li>, which never moves: the button lifts
               on hover, and at its bottom edge that slid it out from under the
               mouse, so it flickered open and shut. */
            <li
              key={n.id}
              className="group min-w-0"
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return;
                const el = e.currentTarget.firstElementChild as HTMLElement;
                window.clearTimeout(openTimer.current);
                openTimer.current = window.setTimeout(() => openFor(n.id, el), anchor ? 0 : HOVER_OPEN_MS);
              }}
              onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
            >
              <button
                type="button"
                data-feature
                aria-expanded={on}
                aria-controls={on ? 'feature-bubble' : undefined}
                onClick={(e) => {
                  /* A second tap on touch closes it; a mouse click keeps the
                     hover bubble open; Enter or Space opens it. */
                  const type = (e.nativeEvent as PointerEvent).pointerType;
                  if (on && (type === 'touch' || type === 'pen')) close();
                  else openFor(n.id, e.currentTarget);
                }}
                onFocus={(e) => e.currentTarget.matches(':focus-visible') && openFor(n.id, e.currentTarget)}
                className={`flex h-24 w-full flex-col justify-between rounded-[var(--ds-r)] border bg-[var(--ds-card)] p-4 text-left transition-[border-color,transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--ds-sh)] sm:h-28 ${
                  on ? 'border-[var(--ds-ink)] shadow-[var(--ds-sh)]' : 'border-[var(--ds-line)] group-hover:border-[var(--ds-line2)]'
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <n.Icon className={`size-6 ${n.upcoming ? 'text-[var(--ds-dim)]' : ''}`} strokeWidth={1.75} aria-hidden="true" />
                  {n.upcoming && (
                    <span className="rounded-full bg-[var(--ds-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-dim)]">Upcoming</span>
                  )}
                </span>
                <span className="text-[17px] font-semibold leading-tight tracking-tight sm:text-lg">{n.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-sm text-[var(--ds-dim)]">Hover or tap a tile to see what to ask for.</p>
      {/* Portalled: the bubble is fixed-positioned from the tile's rect, and a
          stacking context, overlay or zoomed parent around the grid would
          otherwise clip or shift it. */}
      {anchor && createPortal(<NeedBubble anchor={anchor} closing={closing} onEnter={cancelClose} onLeave={scheduleClose} />, document.body)}
    </div>
  );
}
