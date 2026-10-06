'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, CloudOff, Lock, RotateCcw, X } from 'lucide-react';
import { Serif, buttonClass } from '@/app/components/ds';
import { CopyPromptButton, PromptIcon } from '../components/CopyPromptButton';
import { agentIconSrc } from '../lib/agents';
import { NeedsGrid } from '../components/NeedsGrid';
import { HostLink } from './HostLink';
import { trackCTA, trackEvent } from '../lib/tracking';

/* ── "How it works" — a short story, told in scenes ─────────

   One small app, "Studio Bookings", follows the visitor through the whole
   story: it's built, a friend can't open it, the AI puts it online, and now
   everyone can. Keeping one object the whole way through is what makes the
   story feel like cause → effect instead of a row of slides.

   Every scene is a pure function of `t` (ms since the scene began), the same
   pattern as v2's DeployTimeline: one clock, no nested timers, so skipping
   and reduced motion are both just "what is t".

   The visitor sets the pace. A scene plays once and waits. Its button is
   there from the start and asks the question the visitor would ask next
   ("So how do I put it online?"); the next scene answers it. */

const APP = 'Studio Bookings';
const LIVE_URL = 'studio-bookings.embarko.app';

const CLASSES = [
  { day: 'Mon', time: '7:00', name: 'Morning flow', left: '4 spots' },
  { day: 'Wed', time: '18:30', name: 'Slow stretch', left: '2 spots' },
  { day: 'Sat', time: '9:00', name: 'Power yoga', left: 'Full' },
];

/* ── time helpers ── */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const prog = (t: number, at: number, len: number) => clamp01((t - at) / len);
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const typed = (s: string, t: number, at: number, perChar = 42) =>
  s.slice(0, Math.max(0, Math.floor((t - at) / perChar)));

/** Fades and lifts something in from `at`. */
function rise(t: number, at: number, len = 520, y = 14): React.CSSProperties {
  const p = ease(prog(t, at, len));
  return { opacity: p, transform: `translateY(${(1 - p) * y}px)` };
}

/* ── shared props ── */

function Cursor({ x, y, down }: { x: number; y: number; down?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute z-20 drop-shadow-[0_2px_3px_rgba(0,0,0,.18)]"
      style={{ left: x, top: y, transform: `scale(${down ? 0.86 : 1})`, transition: 'transform 120ms' }}
    >
      <path d="M4 2l15 9.5-6.6 1.4L16 20l-3 1.6-3.5-7.2L4 19z" fill="var(--ink)" stroke="var(--surface)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return <span className="hiw-spin inline-block size-3.5 rounded-full border-2 border-[var(--ds-line2)] border-t-[var(--ds-ink)]" />;
}

function LivePill({ style }: { style?: React.CSSProperties }) {
  return (
    <span
      style={style}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ok-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ok-ink)]"
    >
      <span className="hiw-ping relative size-1.5 rounded-full bg-[var(--ok)]" />
      Live
    </span>
  );
}

/* A browser window. `url` is what the bar shows right now. */
function AppWindow({
  url,
  secure,
  caret,
  children,
  className = '',
  style,
}: {
  url: string;
  secure?: boolean;
  caret?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`overflow-hidden rounded-[18px] border border-[var(--ds-line)] bg-[var(--ds-card)] text-left shadow-[var(--ds-sh2)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--ds-line)] px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-[9px] rounded-full bg-[var(--ds-line2)]" />
          ))}
        </span>
        <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md bg-[var(--ds-soft)] px-2 py-1 font-mono text-[11px] text-[var(--ds-mute)] sm:text-xs">
          {secure && <Lock className="size-3 flex-none" strokeWidth={2.25} aria-hidden="true" />}
          <span className="truncate">{url}</span>
          {caret && <span className="hiw-caret -ml-1">▍</span>}
        </span>
      </div>
      {children}
    </div>
  );
}

/* The app itself: one small, believable thing the story follows. */
function BookingsApp() {
  return (
    <div className="p-4 sm:p-5">
      <span className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
        <span className="grid size-6 place-items-center rounded-md bg-[var(--ds-ink)] text-[11px] text-[var(--ds-card)]">S</span>
        {APP}
      </span>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-[var(--ds-dim)]">This week</p>
      <ul className="mt-1.5 space-y-1.5">
        {CLASSES.map((c) => (
          <li key={c.name} className="flex items-center gap-3 rounded-[10px] bg-[var(--ds-soft)] px-3 py-2 text-[12px]">
            <span className="w-[74px] flex-none whitespace-nowrap font-mono text-[11px] text-[var(--ds-mute)]">
              {c.day} {c.time}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
            <span className="flex-none text-[11px] text-[var(--ds-mute)]">{c.left}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── the scenes ─────────────────────────────────────────── */

type Scene = {
  id: string;
  /** How long the scene's animation runs. Then it holds and waits. */
  dur: number;
  /** The visitor's next question — the button that moves the story on. */
  next?: string;
  /** The caption, line by line: when each line arrives, and what it says. */
  lines: { at: number; text: React.ReactNode }[];
  Stage: (p: { t: number }) => React.ReactNode;
};

/* 1 · The app, already built. Still on purpose: the story starts calm,
   and the motion begins when something actually changes. */
function MadeStage() {
  return (
    <AppWindow url="localhost:3000" className="w-full max-w-[420px]">
      <BookingsApp />
    </AppWindow>
  );
}

/* 2 · A friend tries the link on their computer. One window, one error. */
function FriendStage({ t }: { t: number }) {
  const url = typed('localhost:3000', t, 500, 45);
  const loading = t >= 1200 && t < 2100;
  const failed = t >= 2100;
  return (
    <div className="flex w-full flex-col items-center gap-3" style={rise(t, 0, 600, 24)}>
      <AppWindow url={url} caret={t < 1200} className="w-full max-w-[420px]">
        {/* Same height as the app window in scene 1, so the swap reads as
            "same link, different screen". */}
        <div className="flex h-[196px] flex-col items-center justify-center px-6 text-center sm:h-[212px]">
          {loading && <Spinner />}
          {failed && (
            <div style={rise(t, 2100, 450, 8)}>
              <CloudOff className="mx-auto size-8 text-[var(--ds-dim)]" strokeWidth={1.5} aria-hidden="true" />
              <p className="mt-3 text-[15px] font-semibold">This site can&rsquo;t be reached</p>
              <p className="mt-1 text-[12px] text-[var(--ds-mute)]">localhost refused to connect.</p>
            </div>
          )}
        </div>
      </AppWindow>
      <p className="text-xs font-medium text-[var(--ds-dim)]" style={rise(t, 2400)}>
        Your friend&rsquo;s computer
      </p>
    </div>
  );
}

/* 3 · Copy one prompt. A cursor clicks; the prompt lifts out. */
function CopyStage({ t }: { t: number }) {
  const move = ease(prog(t, 300, 1100));
  const down = t > 1450 && t < 1650;
  const copied = t >= 1600;
  const sheet = ease(prog(t, 1900, 800));
  return (
    <div className="relative flex w-full max-w-[460px] flex-col items-center">
      <div className="relative w-full rounded-[22px] border border-[var(--ds-line)] bg-[var(--ds-card)] px-6 pb-8 pt-6 text-center shadow-[var(--ds-sh)]" style={rise(t, 0)}>
        <p className="text-[13px] font-bold tracking-tight">Embarko</p>
        <p className="mt-1 text-[12px] text-[var(--ds-mute)]">Hosting for apps you build with AI</p>
        <span
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--ds-ink)] px-5 py-2.5 text-[14px] font-semibold text-[var(--ds-card)]"
          style={{ transform: `scale(${down ? 0.95 : 1})`, transition: 'transform 120ms' }}
        >
          {copied ? <Check className="size-4" strokeWidth={2.5} /> : null}
          {copied ? 'Copied' : 'Copy prompt'}
        </span>
        {t < 2300 && <Cursor x={60 + move * 185} y={170 - move * 78} down={down} />}
      </div>
      {/* The prompt itself: the visitor never reads it, their AI does. */}
      <div
        className="relative -mt-3 w-[86%] rounded-[16px] border border-[var(--ds-line)] bg-[var(--ds-card)] p-4 text-left shadow-[var(--ds-sh2)]"
        style={{ opacity: sheet, transform: `translateY(${(1 - sheet) * -30}px) rotate(${sheet * -2}deg)` }}
      >
        <p className="text-[12px] font-semibold">Embarko prompt</p>
        <div className="mt-2 space-y-1.5" aria-hidden="true">
          {[92, 78, 85, 54].map((w, i) => (
            <span key={i} className="block h-1.5 rounded-full bg-[var(--ds-soft)]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* 4 · Paste it into your AI. It does the hosting work, step by step. */
const AI_STEPS = [
  { at: 2600, text: 'Reading your app' },
  { at: 3300, text: 'Packing it up' },
  { at: 4000, text: 'Setting up its database' },
  { at: 4700, text: 'Putting it online' },
];
const ASK = 'put my bookings app online';
function PasteStage({ t }: { t: number }) {
  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-[20px] border border-[var(--ds-line)] bg-[var(--ds-card)] text-left shadow-[var(--ds-sh2)]" style={rise(t, 0, 600, 20)}>
      <div className="flex items-center justify-between border-b border-[var(--ds-line)] px-4 py-2.5">
        <span className="text-[12px] font-semibold">Your AI</span>
        <span className="flex items-center gap-2" aria-hidden="true">
          {['claudecode', 'cursor', 'codex'].map((s) => (
            <img key={s} src={agentIconSrc(s)} alt="" className="size-3.5 opacity-60" />
          ))}
          <span className="text-[11px] text-[var(--ds-dim)]">or any agent</span>
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[var(--ds-soft)] p-2.5" style={rise(t, 300)}>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ds-line)] bg-[var(--ds-card)] px-2 py-1 text-[11px] font-semibold">
            <span className="grid size-4 place-items-center rounded bg-[var(--ds-ink)] text-[9px] text-[var(--ds-card)]">E</span>
            Embarko prompt
          </span>
          <p className="mt-1.5 min-h-[18px] text-[13px]">
            {typed(ASK, t, 900)}
            {t > 900 && t < 2200 && <span className="hiw-caret">▍</span>}
          </p>
        </div>
        <div className="space-y-1.5" style={rise(t, 2400)}>
          {AI_STEPS.map((s, i) => {
            const next = AI_STEPS[i + 1]?.at ?? 5400;
            if (t < s.at) return null;
            return (
              <p key={s.text} className="flex items-center gap-2 text-[13px] text-[var(--ds-mute)]" style={rise(t, s.at, 300, 6)}>
                {t < next ? <Spinner /> : <Check className="size-3.5 text-[var(--ds-ink)]" strokeWidth={2.75} />}
                {s.text}
              </p>
            );
          })}
          {t >= 5500 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[13px] font-semibold" style={rise(t, 5500, 400, 6)}>
              Done. It&rsquo;s live at
              <span className="rounded-md bg-[var(--ok-soft)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ok-ink)]">{LIVE_URL}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* 5 · It's live, for everyone. The address bar is the whole story. */
function LiveStage({ t }: { t: number }) {
  // The address bar backspaces localhost, then types the real link.
  const erase = 'localhost:3000'.slice(0, Math.max(0, 14 - Math.floor(prog(t, 200, 350) * 14)));
  const url = t < 600 ? erase : typed(LIVE_URL, t, 600, 30);
  const done = t >= 600 + LIVE_URL.length * 30;
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AppWindow url={url} secure={done} caret={!done} className="w-full max-w-[420px]">
        <BookingsApp />
      </AppWindow>
      <LivePill style={rise(t, 1500)} />
    </div>
  );
}

/* 6 · The end: what's already there when the app needs more, then the one
   thing to do next. The tiles answer the visitor's last doubt ("but what
   about a database?") right before the button. */
function EndStage({ t, onReplay }: { t: number; onReplay: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
      <div className="w-full text-center" style={rise(t, 700, 600, 16)}>
        <p className="ds-kicker">When your app needs more, you already have it</p>
        <div className="mt-4">
          <NeedsGrid />
        </div>
      </div>
      <div className="mt-7 flex flex-col items-center gap-3" style={rise(t, 1100)}>
        <CopyPromptButton
          className={buttonClass('glow', 'lg')}
          copiedChildren={<><Check className="size-4" aria-hidden="true" />Prompt copied. Paste in your AI</>}
          onClicked={() => trackCTA('copy')}
        >
          <PromptIcon aria-hidden="true" />
          Host your app
        </CopyPromptButton>
        <button type="button" onClick={onReplay} className={buttonClass('ghost', 'sm')}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Watch again
        </button>
      </div>
    </div>
  );
}

const SCENES: Scene[] = [
  {
    id: 'made',
    next: 'Nice. Can your friends use it?',
    dur: 600,
    lines: [{ at: 0, text: <>You&rsquo;ve built an <Serif grad>app</Serif> on your computer.</> }],
    Stage: MadeStage,
  },
  {
    id: 'friend',
    next: 'So how do you put it online?',
    dur: 2900,
    lines: [{ at: 0, text: <>But your friends <Serif grad>can&rsquo;t</Serif> see it.</> }],
    Stage: FriendStage,
  },
  {
    id: 'copy',
    next: 'Copied. Now what?',
    dur: 3200,
    lines: [
      { at: 0, text: <><Serif grad>Copy</Serif> the Embarko prompt.</> },
      { at: 2400, text: 'It teaches your AI how to put apps online.' },
    ],
    Stage: CopyStage,
  },
  {
    id: 'paste',
    next: 'Wait, is it really live?',
    dur: 6100,
    lines: [
      { at: 0, text: <><Serif grad>Paste</Serif> it into your AI.</> },
      { at: 2500, text: 'It does the hosting work for you.' },
    ],
    Stage: PasteStage,
  },
  {
    id: 'live',
    next: 'Sum it up for me',
    dur: 2200,
    lines: [{ at: 0, text: <>Yes, it&rsquo;s <Serif grad>live</Serif> for all.</> }],
    Stage: LiveStage,
  },
  {
    id: 'end',
    dur: 1800,
    lines: [
      { at: 0, text: 'Your AI builds it.' },
      { at: 500, text: <>Embarko keeps it <Serif grad>live</Serif>.</> },
    ],
    Stage: () => null, // rendered inline below: it needs the replay handler
  },
];

/* ── the sky ─────────────────────────────────────────────

   Soft clouds drifting behind the story, drawn on a canvas so dozens of
   blurred shapes cost nothing. Colours come from the theme tokens, so it
   follows light and dark. Still under reduced motion. */
function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A gradient to plain 'transparent' fades through black and leaves grey
    // fringes, so fade to the same colour at zero alpha instead.
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || '#eceae3';
    const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) || 0);
    const solid = `rgba(${r},${g},${b},1)`;
    const clear = `rgba(${r},${g},${b},0)`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const size = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    // Each cloud is a cluster of soft puffs, drifting right at its own pace.
    const clouds = Array.from({ length: 7 }, (_, i) => ({
      x: (i / 7) * 1.3 - 0.15,
      y: 0.08 + ((i * 37) % 80) / 100,
      s: 0.6 + ((i * 53) % 50) / 100,
      v: 0.000004 + ((i * 17) % 10) / 1_600_000,
      puffs: [0, 1, 2, 3].map((k) => ({ dx: (k - 1.5) * 46, dy: (k % 2 ? -1 : 1) * 12, r: 60 + ((k * 29 + i * 11) % 40) })),
    }));
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const cl of clouds) {
        if (!still) cl.x += cl.v * dt;
        if (cl.x > 1.25) cl.x = -0.25;
        const cx = cl.x * w;
        const cy = cl.y * h;
        for (const p of cl.puffs) {
          const r = p.r * cl.s * (w < 640 ? 0.7 : 1);
          const g = ctx.createRadialGradient(cx + p.dx * cl.s, cy + p.dy * cl.s, 0, cx + p.dx * cl.s, cy + p.dy * cl.s, r);
          g.addColorStop(0, solid);
          g.addColorStop(0.45, solid);
          g.addColorStop(1, clear);
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx + p.dx * cl.s, cy + p.dy * cl.s, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}

/* ── the player ─────────────────────────────────────────── */

export function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [t, setT] = useState(0);
  /* The furthest scene reached: progress segments up to here are a way back. */
  const [seen, setSeen] = useState(0);
  const [still, setStill] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const last = SCENES.length - 1;
  const scene = SCENES[i];
  const done = t >= scene.dur;

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(last, n));
      setI(next);
      setSeen((s) => Math.max(s, next));
      // Reduced motion shows each scene's finished frame instead of playing it.
      setT(still ? SCENES[next].dur : 0);
    },
    [last, still],
  );
  // Fresh start every time it opens.
  useEffect(() => {
    if (!open) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    setI(0);
    setSeen(0);
    setT(reduce ? SCENES[0].dur : 0);
    trackEvent('how_it_works_opened');
    closeRef.current?.focus();
  }, [open]);

  // The clock runs only while a scene is animating, then stops and waits.
  // Frame deltas are capped so a background tab doesn't jump to the end.
  useEffect(() => {
    if (!open || done) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - prev);
      prev = now;
      setT((x) => Math.min(SCENES[i].dur, x + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, done, i]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && i < last) go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    // Capture phase, so the deck behind never sees these keys.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, i, last, go, onClose]);

  if (!open) return null;
  const isEnd = i === last;

  /* Portalled to <body>: the v2 deck is its own stacking context (`isolate`),
     and from inside it no z-index can cover the beta bar. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How Embarko works"
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--ds-ink)]"
    >
      <style>{`
        @keyframes hiw-spin { to { transform: rotate(360deg) } }
        @keyframes hiw-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes hiw-ping { 0% { box-shadow: 0 0 0 0 var(--ok-soft) } 100% { box-shadow: 0 0 0 7px transparent } }
        @keyframes hiw-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes hiw-nudge { 0%,70%,100% { transform: translateX(0) } 85% { transform: translateX(4px) } }
        .hiw-spin { animation: hiw-spin .8s linear infinite }
        .hiw-caret { animation: hiw-blink 1s step-end infinite }
        .hiw-ping { animation: hiw-ping 1.6s ease-out infinite }
        .hiw-scene { animation: hiw-in .5s var(--ds-ease) both }
        .hiw-ask { animation: hiw-in .45s var(--ds-ease) both }
        .hiw-nudge { animation: hiw-nudge 2.4s ease-in-out 1s infinite }
        @media (prefers-reduced-motion: reduce) {
          .hiw-spin, .hiw-caret, .hiw-ping, .hiw-scene, .hiw-ask, .hiw-nudge { animation: none }
        }
      `}</style>
      <Sky />

      {/* Progress: one segment per scene. Scenes already seen are a way back. */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <ol className="flex flex-1 gap-1.5" aria-label="Story progress">
          {SCENES.map((s, n) => (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => go(n)}
                disabled={n > seen}
                aria-label={`Scene ${n + 1} of ${SCENES.length}`}
                aria-current={n === i ? 'step' : undefined}
                className="block w-full py-2 disabled:cursor-default"
              >
                <span className="block h-[3px] overflow-hidden rounded-full bg-[var(--ds-line2)]">
                  <span
                    className="block h-full rounded-full bg-[var(--ds-ink)]"
                    style={{ width: `${n < i ? 100 : n > i ? 0 : clamp01(t / s.dur) * 100}%` }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close story"
          className="grid size-10 flex-none place-items-center rounded-full text-[var(--ds-mute)] transition-colors hover:bg-[var(--ds-soft)] hover:text-[var(--ds-ink)]"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Caption, stage and the way on, as one group centred on screen, so
          the eye never travels from the picture down to a far-off button.
          Keyed by scene so each one arrives fresh. Centred with `m-auto` (not
          justify-center) so a tall scene on a small phone scrolls from its
          true top instead of overflowing above it. */}
      <div key={scene.id} className="hiw-scene relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-4 sm:px-8">
        <div className="m-auto flex w-full flex-col items-center">
        <h2
          aria-live="polite"
          className={`mx-auto max-w-[20ch] text-balance text-center font-extrabold leading-[1.02] tracking-[-0.045em] [&_.ds-serif]:pr-[0.06em] ${
            'text-[30px] sm:text-[44px] md:text-[54px]'
          }`}
        >
          {scene.lines.map((l, n) => (
            <span
              key={n}
              className={`block ${n > 0 && !isEnd ? 'mt-2 text-[0.62em] font-semibold tracking-[-0.02em] text-[var(--ds-mute)]' : ''}`}
              style={t >= l.at ? rise(t, l.at, 600, 10) : { opacity: 0 }}
            >
              {l.text}
            </span>
          ))}
        </h2>
        {/* A steady min-height, so the button below doesn't creep down while
            a scene's picture grows. */}
        {isEnd ? (
          /* Not zoomed: the tiles are already full-size UI, and their bubbles
             position from real screen coordinates. */
          <div className="w-full pt-8">
            <EndStage t={t} onReplay={() => go(0)} />
          </div>
        ) : (
          <div className="flex min-h-[300px] w-full items-center justify-center py-6 sm:min-h-[320px] sm:py-8 lg:[zoom:1.2] min-[1440px]:[zoom:1.35]">
            <scene.Stage t={t} />
          </div>
        )}

      {/* The way on: the visitor's own next question, as the one big button.
          It's there from the start, so nobody waits on an animation. */}
        <div className="flex min-h-[52px] w-full max-w-[640px] justify-center">
          {!isEnd && (
            <button
              type="button"
              onClick={() => go(i + 1)}
              className={buttonClass('primary', 'lg', 'hiw-ask group max-w-full')}
            >
              <span className="truncate">{scene.next}</span>
              <ArrowRight className="hiw-nudge size-4 flex-none" aria-hidden="true" />
            </button>
          )}
        </div>
        </div>
      </div>

      {/* The foot, same spot on every scene: "Host your app" for anyone ready
          to start now (the last scene has the full button instead), and Back,
          small — an escape route, kept apart from the path forward. */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-5 sm:pb-7">
        <div className={isEnd ? 'invisible' : ''}>
          <HostLink />
        </div>
        <button
          type="button"
          onClick={() => go(i - 1)}
          aria-label="Previous scene"
          className={`${buttonClass('secondary', 'md', '!w-11 !px-0')} ${i === 0 ? 'invisible' : ''}`}
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
