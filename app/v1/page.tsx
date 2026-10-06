'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CalendarClock, Check, Database, Globe, History, KeyRound, Lock, Mail, Sparkles, Upload, UserRound, Workflow,
  type LucideIcon,
} from 'lucide-react';
import { trackPageView, trackCTA } from '../lib/tracking';
import { DEPLOY_PROMPT } from '../lib/deployPrompt';
import { SectionSnap } from './SectionSnap';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ExampleAppCards } from '../components/ExampleAppCards';
import { ButtonLink, GlowBackdrop, Pill, PrimaryCta, Serif } from '@/app/components/ds';

/* Display headings: the ds hero weight and tracking, sized per scene. */
const H_DISPLAY = 'font-extrabold leading-[0.98] tracking-[-0.045em]';

/* Exactly what the copy button puts on the clipboard, shown as it will be
   pasted, so nobody wonders what they're handing their AI. */
const PROMPT_LINES = DEPLOY_PROMPT.split('\n');

/* The page's one action, the same button in every scene. */
function CopyPromptCta({ size }: { size?: 'md' | 'lg' }) {
  return <PrimaryCta size={size} label="Host your app" onClicked={() => trackCTA('copy')} />;
}

/* The prompt's lines, with only URLs allowed to break mid-word. */
function PromptText() {
  return (
    <>
      {PROMPT_LINES.map((line, i) => (
        <span key={i} className="block">
          {line.split(/(https?:\/\/\S+)/).map((part, j) =>
            /^https?:\/\//.test(part) ? <span key={j} className="break-all">{part}</span> : part,
          )}
        </span>
      ))}
    </>
  );
}

/* Step 1 as one object: the prompt text and the button that copies it. The
   text is the real prompt; nothing else on the page looks copyable. */
function PromptCard({ onCopied }: { onCopied?: () => void }) {
  return (
    <div className="w-full overflow-hidden rounded-[18px] bg-[var(--ds-dark)] text-left">
      <p className="px-4 pb-3 pt-4 font-mono text-[12.5px] leading-relaxed text-white/90">
        <PromptText />
      </p>
      <div className="px-3 pb-3">
        <PrimaryCta
          size="md"
          glow={false}
          label="Host your app"
          onClicked={() => trackCTA('copy')}
          onCopied={onCopied}
          className="!w-full !bg-white !text-[var(--ds-ink)] hover:!bg-white/90"
        />
      </div>
    </div>
  );
}

function PageViewTracker() {
  useEffect(() => {
    trackPageView();
  }, []);
  return null;
}

/* ------------------------------------------------------------------ hero */

const AGENT_MARKS = [
  { slug: 'claudecode', name: 'Claude' },
  { slug: 'codex', name: 'Codex' },
  { slug: 'cursor', name: 'Cursor' },
];

/* The timeline's dotted line: round dots on a vertical track, drawn with a
   background so it stretches to any height without extra markup. */
const DOTS: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, var(--ds-dim) 1.4px, transparent 1.9px)',
  backgroundSize: '4px 11px',
  backgroundRepeat: 'repeat-y',
  backgroundPosition: 'center top',
};

function DottedLine({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block w-1 ${className}`} style={DOTS} />;
}

function Dot({ n, active }: { n: string; active?: boolean }) {
  return (
    <span
      className={`relative z-10 grid size-10 place-items-center rounded-full text-[15px] font-bold transition-colors duration-300 ${
        active
          ? 'bg-[var(--ds-ink)] text-[var(--ds-card)] shadow-[0_0_0_6px_var(--bg),0_0_0_7px_var(--ds-line2)]'
          : 'border border-[var(--ds-line2)] bg-[var(--ds-card)] text-[var(--ds-ink)] shadow-[0_0_0_6px_var(--bg)]'
      }`}
    >
      {n}
    </span>
  );
}

/* One stop on the hero's centre timeline. Steps alternate sides of the line,
   so the dotted path down the middle stays the thing the eye follows. */
function TimelineStep({ n, title, side, active, last, children }: { n: string; title: string; side: 'left' | 'right'; active?: boolean; last?: boolean; children?: React.ReactNode }) {
  const words = (
    <div className={`min-w-0 pt-1.5 ${side === 'left' ? 'text-right' : 'text-left'}`}>
      <p className="text-lg font-semibold leading-tight tracking-tight">{title}</p>
      {children && <div className="mt-1.5 text-[15px] text-[var(--ds-mute)]">{children}</div>}
    </div>
  );
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-4 pb-9 last:pb-0 sm:gap-x-6">
      {/* From this dot down to the next one, so the line stops at the last dot. */}
      {!last && <DottedLine className="absolute bottom-0 left-1/2 top-5 -translate-x-1/2" />}
      {side === 'left' ? words : <span />}
      <Dot n={n} active={active} />
      {side === 'right' ? words : <span />}
    </li>
  );
}

/* The hero's three steps on a dotted centre line, dot 1 to dot 3. Copying
   lights up step 2, and it stays lit: the visitor has moved on, so the
   timeline never jumps back to step 1. */
function HeroTimeline() {
  const [copied, setCopied] = useState(false);

  return (
    <ol className="mx-auto w-full max-w-3xl">
      <TimelineStep n="1" title="Copy the prompt" side="right" active={!copied}>
        <div className="mt-3">
          <PrimaryCta size="lg" label="Host your app" onClicked={() => trackCTA('copy')} onCopied={() => setCopied(true)} />
        </div>
      </TimelineStep>
      <TimelineStep n="2" title={copied ? 'Now paste it into your AI' : 'Paste it into your AI'} side="left" active={copied}>
        The same chat where you built your app.
        {/* Answers "does it work with my AI?" right where the question comes up. */}
        <span className="mt-2.5 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[13px]">
          {AGENT_MARKS.map((a) => (
            <span key={a.slug} className="inline-flex items-center gap-1.5 text-[var(--ds-ink)]">
              <img src={`/agenticons/agenticon-${a.slug}.svg`} alt="" aria-hidden="true" className="size-3.5" />
              {a.name}
            </span>
          ))}
          <span>or any agent</span>
        </span>
      </TimelineStep>
      <TimelineStep n="3" title="Get a live link" side="right" last>
        Your AI puts the app online and sends you the link.
        {/* What the result looks like, so it isn't abstract. */}
        <span className="mt-2.5 flex w-fit items-center gap-2 rounded-full border border-[var(--ds-line)] bg-[var(--ds-card)] px-3 py-1.5 shadow-[var(--ds-sh)]">
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ok)]">
            <Check className="size-3.5" aria-hidden="true" />
            Live
          </span>
          <span className="font-mono text-[13px] text-[var(--ds-ink)]">yourapp.embarko.app</span>
        </span>
      </TimelineStep>
    </ol>
  );
}

/* ------------------------------------------------------- what it needs */

/* Every line here is checked against content/docs/capabilities.md. "Not yet"
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
  { name: 'Schedules', icon: CalendarClock, what: 'Not built in yet. For now, your AI can trigger the app from an outside scheduler.', notYet: true },
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
      className="ds-pop fixed z-50 rounded-[18px] border border-[var(--ds-line)] bg-[var(--ds-card)] p-4 text-left shadow-[var(--ds-sh2)]"
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
function NeedsGrid() {
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
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', follow);
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
      {anchor && <NeedBubble anchor={anchor} closing={closing} onEnter={cancelClose} onLeave={scheduleClose} />}
    </div>
  );
}

/* ---------------------------------------------------------------- page */

const EXAMPLES = [
  'A portfolio',
  'A college project',
  'An internal CRM',
  'A customer portal',
  'A dashboard',
  'A small SaaS',
  'A website',
];

const SCENE = 'flex min-h-[100dvh] flex-col items-center justify-center px-4 py-20 sm:px-6';

export default function EmbarkoV1() {
  return (
    /* The header sits OUTSIDE #v1-scenes on purpose: that wrapper has
       overflow-x-hidden, and an overflow ancestor becomes the containing block
       for position:sticky, which stops the header sticking at all. */
    <>
      <PageViewTracker />
      <SiteHeader />

      {/* Scene heights are 100dvh, not 100vh: on mobile 100vh is taller than
          what is visible, which stops SectionSnap from ever firing. */}
      <div id="v1-scenes" className="overflow-x-hidden bg-background text-foreground antialiased">
        <SectionSnap containerSelector="#v1-scenes" offsetSelector="nav" />

        {/* SCREEN 1: PROMISE + INSTRUCTION. The whole first screen is the job. */}
        <section className={`relative isolate ${SCENE}`}>
          <GlowBackdrop position="top" />
          <div className="relative z-10 w-full max-w-5xl text-center">
            <Pill grad className="ds-pill-magic mb-6">
              <Sparkles aria-hidden="true" />
              Built for the AI era
            </Pill>
            <h1 className={`${H_DISPLAY} text-[44px] sm:text-6xl md:text-[80px]`}>
              Hosting made <Serif grad>ridiculously</Serif> easy.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--ds-mute)] sm:mt-5 md:text-xl">
              Your AI built the app. Let it put the app online too.
            </p>

            <div className="mt-8 sm:mt-10">
              <HeroTimeline />
            </div>
          </div>
        </section>

        {/* SCREEN 3: WHEN THE APP NEEDS MORE. Tiles first, detail on tap. */}
        <section className={SCENE}>
          <div className="w-full max-w-5xl space-y-10 text-center">
            <div className="space-y-4">
              <p className="ds-kicker">When your app needs more</p>
              <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>
                Need more? You <Serif grad>already</Serif> have it.
              </h2>
            </div>
            <NeedsGrid />
            <p className="text-[15px] text-[var(--ds-mute)]">
              No Firebase setup. No S3 setup. No OAuth console. <span className="font-semibold text-[var(--ds-ink)]">Life&apos;s too short for that.</span>
            </p>
          </div>
        </section>

        {/* SCREEN 4: EXAMPLES. Big words, so a student sees their project. */}
        <section className={SCENE}>
          <div className="w-full max-w-5xl space-y-12 text-center">
            <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>
              What can you put <Serif grad>online?</Serif>
            </h2>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {EXAMPLES.map((e, i) => (
                <li key={e} className={i % 2 ? 'text-[var(--ds-mute)]' : ''}>
                  {e}
                </li>
              ))}
              <li className="basis-full text-[var(--ds-ink)]">
                That random useful app you built <Serif>yesterday</Serif>
              </li>
            </ul>
            <div className="space-y-6 border-t border-[var(--ds-line)] pt-10">
              <p className="text-lg text-[var(--ds-mute)] md:text-xl">Build it with AI. Ask the same AI to deploy it.</p>
              <div className="flex justify-center">
                <CopyPromptCta size="md" />
              </div>
            </div>
          </div>
        </section>

        {/* SCREEN 5: TEAMS. Why a company eventually pays. */}
        <section className={SCENE}>
          <div className="w-full max-w-6xl space-y-10 text-center">
            <div className="space-y-4">
              <p className="ds-kicker">For teams</p>
              <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>
                One <Serif grad>home</Serif> for everything your team builds with AI.
              </h2>
            </div>
            <ExampleAppCards className="ex-apps-5" />
            <div className="flex justify-center">
              <ButtonLink href="/pricing" size="lg">See team plans</ButtonLink>
            </div>
          </div>
        </section>

        {/* FINAL: back to the exact action. The footer rides in this scene so
            nobody scrolls past a finished page to reach the links. */}
        <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 pt-20 sm:px-6">
          <GlowBackdrop />
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="max-w-3xl space-y-10 text-center">
              <h2 className={`${H_DISPLAY} text-5xl sm:text-6xl md:text-7xl`}>
                Already built <Serif grad>something?</Serif>
              </h2>
              <div className="mx-auto max-w-md">
                <PromptCard />
              </div>
              <p className="text-[var(--ds-mute)]">Paste it into the AI chat where you built your app. It replies with a live link.</p>
            </div>
          </div>
          {/* -mx undoes the section's own gutter so the footer keeps its own. */}
          <div className="relative z-10 -mx-4 sm:-mx-6">
            <SiteFooter />
          </div>
        </section>
      </div>
    </>
  );
}
