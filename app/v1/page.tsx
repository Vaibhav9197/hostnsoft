'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp, CalendarClock, Check, Database, Globe, History, KeyRound, Loader2, Lock, Mail, Sparkles, Upload, UserRound, Workflow,
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

/** True once the element has scrolled into view; stays true. */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

/* ------------------------------------------------------------------ hero */

const AGENT_MARKS = [
  { slug: 'claudecode', name: 'Claude' },
  { slug: 'codex', name: 'Codex' },
  { slug: 'cursor', name: 'Cursor' },
];

/* How long step 2 stays highlighted after a copy. */
const NUDGE_MS = 12_000;

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
function TimelineStep({ n, title, side, active, children }: { n: string; title: string; side: 'left' | 'right'; active?: boolean; children?: React.ReactNode }) {
  const words = (
    <div className={`min-w-0 pt-1.5 ${side === 'left' ? 'text-right' : 'text-left'}`}>
      <p className="text-lg font-semibold leading-tight tracking-tight">{title}</p>
      {children && <div className="mt-1.5 text-[15px] text-[var(--ds-mute)]">{children}</div>}
    </div>
  );
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-4 pb-9 last:pb-0 sm:gap-x-6">
      {side === 'left' ? words : <span />}
      <Dot n={n} active={active} />
      {side === 'right' ? words : <span />}
    </li>
  );
}

/* Takes the visitor to a timeline scene (step 2 after a copy, step 3 after
   "send"). Lands where SectionSnap would, just under the beta bar. */
function scrollToScene(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const beta = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--beta-bar-h')) || 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - beta, behavior: reduced ? 'auto' : 'smooth' });
}

/* The hero's three steps on a dotted centre line that runs on into the next
   sections. Copying lights up step 2 and scrolls to it. */
function HeroTimeline() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const scroll = window.setTimeout(() => scrollToScene('paste'), 700);
    const reset = window.setTimeout(() => setCopied(false), NUDGE_MS);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(reset);
    };
  }, [copied]);

  return (
    <ol className="relative mx-auto w-full max-w-2xl">
      {/* From the first dot down to the bottom of the list, where the
          section's own dotted line takes over. */}
      <DottedLine className="absolute bottom-0 left-1/2 top-5 -translate-x-1/2" />
      <TimelineStep n="1" title="Copy the prompt" side="right" active={!copied}>
        <div className="mt-3">
          <PrimaryCta size="md" label="Host your app" onClicked={() => trackCTA('copy')} onCopied={() => setCopied(true)} />
        </div>
      </TimelineStep>
      <TimelineStep n="2" title={copied ? 'Now paste it into your AI' : 'Paste it into your AI'} side="left" active={copied}>
        The same chat where you built your app.
      </TimelineStep>
      <TimelineStep n="3" title="Get a live link" side="right">
        Your AI puts the app online and sends you the link.
      </TimelineStep>
    </ol>
  );
}

/* A full-height scene on the timeline: the dotted line comes in from the top
   edge and leaves from the bottom edge, so the scenes join into one path. */
function TimelineScene({
  id,
  lineIn,
  lineOut,
  className = '',
  children,
}: {
  id?: string;
  lineIn?: boolean;
  lineOut?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative isolate flex min-h-[100dvh] flex-col items-center px-4 sm:px-6 ${className}`}>
      {lineIn ? <DottedLine className="min-h-12 flex-1" /> : <span className="min-h-20 flex-1" />}
      {children}
      {lineOut ? <DottedLine className="min-h-12 flex-1" /> : <span className="min-h-16 flex-1" />}
    </section>
  );
}

/* A section's stop on the line: its number and a one-word label. */
function TimelineNode({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3" aria-hidden="true">
      <Dot n={n} active />
      <span className="ds-kicker !mb-0">{label}</span>
    </div>
  );
}

/* Step 2, shown: the agents it works with, and the prompt sitting in a chat
   box ready to send. */
function PasteScene() {
  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {AGENT_MARKS.map((a) => (
          <span key={a.slug} className="ds-pill">
            <img src={`/agenticons/agenticon-${a.slug}.svg`} alt="" aria-hidden="true" className="size-3.5" />
            {a.name}
          </span>
        ))}
        <span className="ds-pill text-[var(--ds-mute)]">or any agent</span>
      </div>
      <div className="rounded-[var(--ds-r)] border border-[var(--ds-line)] bg-[var(--ds-card)] p-4 text-left shadow-[var(--ds-sh2)]">
        <p className="text-[15px] leading-relaxed"><PromptText /></p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-[var(--ds-dim)]">In your app&apos;s chat</span>
          {/* "Send" moves the story on: down to step 3, where the chat plays out. */}
          <button
            type="button"
            onClick={() => scrollToScene('live')}
            aria-label="Send it and see what happens"
            title="Send it and see what happens"
            className="grid size-9 place-items-center rounded-full bg-[var(--ds-ink)] text-[var(--ds-card)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-ink)]"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- the magic */

/* One chat, four beats, revealed in order once on screen: the app, the line
   the person typed, the build, the result. Proof there is no step 4. */
function MagicChat() {
  const { ref, seen } = useSeen<HTMLDivElement>();
  const beat = `transition-all duration-500 motion-reduce:transition-none ${seen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`;
  const delay = (i: number) => ({ transitionDelay: `${i * 700}ms` });
  /* The build finishes a beat after "Building…" appears, and only then does
     the link show, so the chat never claims building and live at once. */
  const [built, setBuilt] = useState(false);
  useEffect(() => {
    if (!seen) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setBuilt(true), reduced ? 0 : 3200);
    return () => window.clearTimeout(id);
  }, [seen]);
  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[var(--ds-r)] border border-[var(--ds-line)] bg-[var(--ds-card)] text-left shadow-[var(--ds-sh2)]"
      aria-label="A chat with an AI agent: the app, the prompt, building, then live"
      role="img"
    >
      <div className="flex items-center gap-2 border-b border-[var(--ds-line)] bg-[var(--ds-soft)] px-4 py-2.5">
        <img src="/agenticons/agenticon-claudecode.svg" alt="" className="size-4" aria-hidden="true" />
        <span className="text-sm font-semibold">Claude</span>
      </div>
      <div className="space-y-4 p-5" aria-hidden="true">
        {/* 1. The app it already built */}
        <div className={beat} style={delay(0)}>
          <p className="mb-2 text-xs text-[var(--ds-dim)]">Your app</p>
          <div className="rounded-[14px] border border-[var(--ds-line)] bg-[var(--ds-soft)] p-3">
            <div className="h-3 w-24 rounded bg-[var(--ds-line2)]" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="h-7 rounded-md bg-[var(--ds-card)]" />
              <div className="h-7 rounded-md bg-[var(--ds-card)]" />
              <div className="h-7 rounded-md bg-[var(--ds-card)]" />
            </div>
          </div>
        </div>
        {/* 2. What the person typed */}
        <div className={`flex justify-end ${beat}`} style={delay(1)}>
          <span className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--ds-dark)] px-4 py-2.5 text-[14px] leading-snug text-white"><PromptText /></span>
        </div>
        {/* 3. Building, then done */}
        <div className={`flex items-center gap-2 text-[15px] text-[var(--ds-mute)] ${beat}`} style={delay(2)}>
          {built ? (
            <>
              <Check className="size-4 text-[var(--ok)]" />
              Build complete
            </>
          ) : (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              Building…
            </>
          )}
        </div>
        {/* 4. Live, once the build is done */}
        <div
          className={`flex items-center justify-between gap-3 rounded-[14px] border border-[var(--ds-line)] p-3 transition-all duration-500 motion-reduce:transition-none ${
            built ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
          style={{ transitionDelay: built ? '400ms' : '0ms' }}
        >
          <span className="inline-flex items-center gap-2 font-semibold text-[var(--ok)]">
            <Check className="size-4" />
            Live
          </span>
          <span className="truncate font-mono text-sm">yourapp.embarko.app</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- what it needs */

/* Every line here is checked against content/docs/capabilities.md. "Not yet"
   marks what Embarko can't do today: don't promise it. */
const NEEDS: { name: string; icon: LucideIcon; what: string; notYet?: boolean }[] = [
  { name: 'Database', icon: Database, what: 'Your AI adds a database that lives with the app and keeps its data across updates.' },
  { name: 'Login', icon: UserRound, what: 'Your AI builds sign-up and login into the app itself. Accounts are stored with the app.' },
  { name: 'File uploads', icon: Upload, what: 'Uploaded files are saved with the app and kept across updates.' },
  { name: 'Custom domain', icon: Globe, what: 'Use your own address, like app.yourcompany.com. Your AI sets it up; you add one DNS record.' },
  { name: 'Secrets', icon: KeyRound, what: 'API keys stay out of the code. Your AI stores them safely for the app.' },
  { name: 'Email', icon: Mail, what: 'Your AI connects an email service you choose. You paste its key once.' },
  { name: 'Private sharing', icon: Lock, what: 'Apps are public by default. Your AI can add a password gate so only your people get in.' },
  { name: 'Logs & recovery', icon: History, what: 'Your AI reads the logs to fix problems, and can roll back to the last good version in seconds.' },
  { name: 'Schedules', icon: CalendarClock, what: 'Not built in yet. For now, your AI can trigger the app from an outside scheduler.', notYet: true },
  { name: 'Background jobs', icon: Workflow, what: 'Not available yet. Short tasks run inside the app; long jobs need to run elsewhere for now.', notYet: true },
];

function NeedsGrid() {
  const [open, setOpen] = useState<string | null>(null);
  const active = NEEDS.find((n) => n.name === open);
  return (
    <div className="w-full">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {NEEDS.map((n) => {
          const on = open === n.name;
          return (
            <li key={n.name} className="min-w-0">
              <button
                type="button"
                aria-expanded={on}
                aria-controls="needs-detail"
                onClick={() => setOpen(on ? null : n.name)}
                className={`flex h-24 w-full flex-col justify-between rounded-[var(--ds-r)] border p-4 text-left transition-colors sm:h-28 ${
                  on
                    ? 'border-[var(--ds-ink)] bg-[var(--ds-ink)] text-[var(--ds-card)]'
                    : 'border-[var(--ds-line)] bg-[var(--ds-card)] hover:border-[var(--ds-line2)]'
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <n.icon className={`size-6 ${n.notYet && !on ? 'text-[var(--ds-dim)]' : ''}`} strokeWidth={1.75} aria-hidden="true" />
                  {n.notYet && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${on ? 'bg-white/15' : 'bg-[var(--ds-soft)] text-[var(--ds-dim)]'}`}>
                      Not yet
                    </span>
                  )}
                </span>
                <span className="text-[17px] font-semibold leading-tight tracking-tight sm:text-lg">{n.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p
        id="needs-detail"
        aria-live="polite"
        className="mx-auto mt-6 min-h-[3.5rem] max-w-xl text-center text-lg text-[var(--ds-mute)]"
      >
        {active ? active.what : 'Tap one to see how it works.'}
      </p>
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
        <TimelineScene lineOut>
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
        </TimelineScene>

        {/* SCREEN 2: PASTE IT INTO YOUR AI. Step 2 of the hero, up close. */}
        <TimelineScene id="paste" lineIn lineOut>
          <div className="w-full max-w-4xl space-y-7 py-6 text-center">
            <TimelineNode n="2" label="Paste" />
            <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>
              Paste it into <Serif grad>your</Serif> AI.
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[var(--ds-mute)]">
              Use the chat where you built the app, so it can see your code. Then send.
            </p>
            <PasteScene />
          </div>
        </TimelineScene>

        {/* SCREEN 3: THAT'S THE DEPLOYMENT. Step 3: the AI does it, and it's live. */}
        <TimelineScene id="live" lineIn>
          <div className="w-full max-w-4xl space-y-6 py-6 text-center">
            <TimelineNode n="3" label="Live" />
            <MagicChat />
            <h2 className={`${H_DISPLAY} text-5xl sm:text-6xl`}>
              That&apos;s the <Serif grad>deployment.</Serif>
            </h2>
          </div>
        </TimelineScene>

        {/* SCREEN 3: WHEN THE APP NEEDS MORE. Tiles first, detail on tap. */}
        <section className={SCENE}>
          <div className="w-full max-w-5xl space-y-10 text-center">
            <div className="space-y-4">
              <p className="ds-kicker">And when your app needs more</p>
              <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>
                Your AI can add what the app <Serif grad>needs</Serif> too.
              </h2>
            </div>
            <NeedsGrid />
            <p className="text-lg font-semibold tracking-tight md:text-xl">
              No Firebase setup. No S3 setup. No OAuth console. Ask your AI.
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
