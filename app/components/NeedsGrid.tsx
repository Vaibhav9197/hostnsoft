'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarClock, Database, Globe, History, KeyRound, Lock, Mail, Upload, UserRound, Workflow,
  type LucideIcon,
} from 'lucide-react';

/* "Need more? You already have it." — the capability tiles, shared by the
   v1 landing scene and the v2 story's last scene. */

/* Every line here is checked against the agent guide (app/lib/guide/content.js). "Not yet"
   marks what Embarko can't do today: don't promise it. */
const NEEDS: { name: string; icon: LucideIcon; what: string; say?: string; notYet?: boolean }[] = [
  { name: 'Database', icon: Database, what: 'Your AI adds a database that lives with the app and keeps its data across updates.', say: 'Add a database to my app.' },
  { name: 'Login', icon: UserRound, what: 'Your AI builds sign-up and login into the app itself. Accounts are stored with the app.', say: 'Add sign-up and login.' },
  { name: 'File uploads', icon: Upload, what: 'Uploaded files are saved with the app and kept across updates.', say: 'Let people upload photos.' },
  { name: 'Custom domain', icon: Globe, what: 'Use your own address, like app.yourcompany.com. Your AI sets it up; you add one DNS record.', say: 'Put my app on app.mycompany.com.' },
  { name: 'Secrets', icon: KeyRound, what: 'API keys stay out of the code. Your AI stores them safely for the app.', say: 'Store my Stripe key as a secret.' },
  { name: 'Email', icon: Mail, what: 'Your AI connects an email service you choose. You paste its key once.', say: 'Send a welcome email when someone signs up.' },
  { name: 'Private sharing', icon: Lock, what: 'Apps are public by default. Your AI can add a password gate so only your people get in.', say: 'Add a password so only my team can open it.' },
  { name: 'Logs & recovery', icon: History, what: 'Your AI reads the logs to fix problems, and can roll back to the last good version in seconds.', say: 'My app broke. Find out why and fix it.' },
  { name: 'Schedules', icon: CalendarClock, what: 'Your AI sets a time, and Embarko calls your app then to do the job. You get an email if a run fails.', say: 'Send me the sales report every Monday at 9.' },
  { name: 'Background jobs', icon: Workflow, what: 'Not available yet. Short tasks run inside the app; long jobs need to run elsewhere for now.', notYet: true },
];

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
  const n = NEEDS.find((x) => x.name === anchor.name)!;
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
    if (!n.say) return;
    try {
      await navigator.clipboard.writeText(n.say);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked: the sentence is on screen to type instead
    }
  }

  return (
    <div
      id="need-bubble"
      role="dialog"
      aria-label={n.name}
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
      <div key={n.name} className="ds-pop-body">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <n.icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {n.name}
        {n.notYet && <span className="rounded-full bg-[var(--ds-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-dim)]">Not yet</span>}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ds-mute)]">{n.what}</p>
      {n.say && (
        <div className="mt-3 rounded-[12px] bg-[var(--ds-soft)] p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ds-dim)]">Say to your AI</p>
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="text-sm font-medium">&ldquo;{n.say}&rdquo;</p>
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? 'Copied' : `Copy: ${n.say}`}
              className="flex-none rounded-md px-1.5 py-0.5 text-xs font-medium text-[var(--ds-mute)] hover:bg-[var(--ds-card)] hover:text-[var(--ds-ink)]"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
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
export function NeedsGrid() {
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
      if (!t.closest('#need-bubble') && !t.closest('[data-need]')) close();
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
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {NEEDS.map((n) => {
          const on = anchor?.name === n.name && !closing;
          return (
            /* Hover is tracked on the <li>, which never moves: the button lifts
               on hover, and at its bottom edge that slid it out from under the
               mouse, so it flickered open and shut. */
            <li
              key={n.name}
              className="group min-w-0"
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return;
                const el = e.currentTarget.firstElementChild as HTMLElement;
                window.clearTimeout(openTimer.current);
                openTimer.current = window.setTimeout(() => openFor(n.name, el), anchor ? 0 : HOVER_OPEN_MS);
              }}
              onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
            >
              <button
                type="button"
                data-need
                aria-expanded={on}
                aria-controls={on ? 'need-bubble' : undefined}
                onClick={(e) => {
                  /* A second tap on touch closes it; a mouse click keeps the
                     hover bubble open; Enter or Space opens it. */
                  const type = (e.nativeEvent as PointerEvent).pointerType;
                  if (on && (type === 'touch' || type === 'pen')) close();
                  else openFor(n.name, e.currentTarget);
                }}
                onFocus={(e) => e.currentTarget.matches(':focus-visible') && openFor(n.name, e.currentTarget)}
                className={`flex h-24 w-full flex-col justify-between rounded-[var(--ds-r)] border bg-[var(--ds-card)] p-4 text-left transition-[border-color,transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--ds-sh)] sm:h-28 ${
                  on ? 'border-[var(--ds-ink)] shadow-[var(--ds-sh)]' : 'border-[var(--ds-line)] group-hover:border-[var(--ds-line2)]'
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <n.icon className={`size-6 ${n.notYet ? 'text-[var(--ds-dim)]' : ''}`} strokeWidth={1.75} aria-hidden="true" />
                  {n.notYet && (
                    <span className="rounded-full bg-[var(--ds-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-dim)]">Not yet</span>
                  )}
                </span>
                <span className="text-[17px] font-semibold leading-tight tracking-tight sm:text-lg">{n.name}</span>
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
