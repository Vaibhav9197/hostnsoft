'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Copy, Bot, Globe } from 'lucide-react';
import { AGENTS, agentIconSrc } from '../lib/agents';
import { GlowBackdrop, PrimaryCta, Serif, Steps, buttonClass } from '@/app/components/ds';
import { trackPageView, trackCTA, trackDeployment } from '../lib/tracking';
import { SiteHeader } from '../components/SiteHeader';
import { InfrastructureTrust, TrustStrip, WhyEmbarko } from '../components/WhyEmbarko';
import { SiteFooter } from '../components/SiteFooter';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';

/* Looping "watch it deploy" timeline shown on step 1. A single elapsed-ms
   counter drives every derived phase, rather than nested timers, so the whole
   sequence stays deterministic and easy to re-time. Disabled under
   prefers-reduced-motion — see the effect in DeployTimeline. */
const CYCLE_MS = 7000;
const STEP2_START = 1400;
const STEP3_START = 4300;
const STEP3_TYPE_MS = 1000;
const SITE_URL = 'your-app.embarko.app';
const LOGS = [
  { t: 1400, text: '> deploy this app to embarko' },
  { t: 2100, text: 'Installing dependencies...' },
  { t: 2800, text: 'Building...' },
  { t: 3500, text: 'Setting up your database...' },
  { t: 3900, text: 'Making it live...' },
];

const STEPS = ['Start', 'Copy', 'Paste'];

/* ── shared bits ───────────────────────────────────────── */

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-auto mt-4 max-w-[16ch] text-[44px] font-extrabold leading-[0.94] tracking-[-0.055em] sm:text-[64px] md:text-[92px] [&_.ds-serif]:pr-[0.06em] [&_.ds-serif]:text-[1.06em]">
      {children}
    </h2>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-relaxed text-[color:var(--ds-mute)] md:text-[19px]">
      {children}
    </p>
  );
}

function StepNumeral({ n }: { n: string }) {
  return <span className="ds-kicker mb-0">{n}</span>;
}

function TrafficLights() {
  return (
    <div className="flex gap-1.5">
      <span className="h-[9px] w-[9px] rounded-full bg-[color:var(--ds-line2)]" />
      <span className="h-[9px] w-[9px] rounded-full bg-[color:var(--ds-line2)]" />
      <span className="h-[9px] w-[9px] rounded-full bg-[color:var(--ds-line2)]" />
    </div>
  );
}

/* ── page ──────────────────────────────────────────────── */

export default function EmbarkoV2() {
  const [step, setStep] = useState(0);
  const [trustOpen, setTrustOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    // Track page view
    trackPageView();

    /* Keyboard navigation: left/right arrows and up/down arrows */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setStep((s) => Math.min(s + 1, 2));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setStep((s) => Math.max(s - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <main className="relative flex h-[calc(100dvh-var(--beta-bar-h))] flex-col overflow-hidden isolate bg-background text-foreground antialiased">
      <SiteHeader />
      <GlowBackdrop position="full" />

      <style>{`
        @keyframes eb-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes eb-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes eb-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes eb-spin  { to { transform: rotate(360deg); } }
        .eb-in    { animation: eb-in .55s cubic-bezier(.16,1,.3,1) both; }
        .eb-caret { animation: eb-blink 1s step-end infinite; }
        .eb-pulse { animation: eb-pulse 1.5s ease-in-out infinite; }
        .eb-spin  { animation: eb-spin .8s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .eb-in, .eb-caret, .eb-pulse, .eb-spin { animation: none; opacity: 1; }
        }
      `}</style>

      {step > 0 && (
        <button
          onClick={() => setStep((s) => s - 1)}
          aria-label="Previous step"
          /* Centred under the 64px header, which owns the top row. */
          /* Opaque, not a tint: it floats over a scrolling column, and a
             translucent fill lets the cards behind it read straight through. */
          className={buttonClass('secondary', 'lg', 'absolute bottom-8 left-1/2 z-20 w-[52px] -translate-x-1/2 !px-0 shadow-[var(--ds-sh)] hover:-translate-x-1/2')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* the one section.

          Centring is done with `m-auto` on the child rather than `items-center`
          here. A centred flex item that outgrows its scroll container overflows
          equally in both directions, and the part above the top edge cannot be
          reached — scrollTop stops at 0. On a phone that put this step's
          headline 77px above the viewport with no way to scroll back up to it.
          Auto margins collapse instead of overflowing, so a tall step scrolls
          from its true top.

          The header is `fixed`, so it takes no space in this column: the top
          padding is what keeps the first line out from under it, and the bottom
          padding clears the back button. */}
      <div className="flex flex-1 justify-center overflow-y-auto px-6 pb-24 pt-24">
        <div
          key={step}
          /* Hero's headline needs a wider column than the demo steps to hold two lines. */
          className={`eb-in m-auto w-full ${step === 0 ? 'max-w-[1180px]' : 'max-w-[1000px]'}`}
        >
          {step === 0 && <Hero onNext={() => setStep(1)} onTrust={() => setTrustOpen(true)} />}
          {step === 1 && <CopyStep onNext={() => setStep(2)} />}
          {step === 2 && <ChatStep />}
        </div>
      </div>

      {/* Bottom right, opposite the back button's bottom-centre. Same opaque
          fill and ring as that button: this deck scrolls under both, and a
          translucent pill lets the content read straight through it. */}
      <button
        onClick={() => setMoreOpen(true)}
        className={buttonClass('secondary', 'sm', 'absolute bottom-8 right-8 z-20 shadow-[var(--ds-sh)] max-[600px]:right-4')}
      >
        More
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <TrustDialog open={trustOpen} onOpenChange={setTrustOpen} />
      <MoreDialog open={moreOpen} onOpenChange={setMoreOpen} />
    </main>
  );
}

/* ── dialogs ───────────────────────────────────────────────

   /v2 is a single 100dvh deck with `overflow-hidden`, so unlike the other
   three versions it has nowhere to put a long section or a footer. Both live
   in dialogs instead: the trust chip opens the first, "More" opens the second.

   Both get `max-h-[86dvh] overflow-y-auto` because their content is taller
   than a laptop viewport — without it the dialog grows past the screen and the
   bottom is unreachable. */

/* Centred with `inset-0 m-auto` rather than the base component's
   `left-1/2 top-1/2 -translate-1/2`. That transform centring stacks with the
   `translate` the open animation sets — a separate CSS property from
   `transform`, so the two compose instead of overriding — and the pair lands
   the box at -100%/-100% instead of -50%/-50%. The 460px default is narrow
   enough that nobody noticed; at this width the dialog ends up off-screen.
   Auto margins need no transform, so there is nothing left to stack with. */
const DIALOG = [
  'inset-0 m-auto h-fit translate-x-0 translate-y-0',
  'w-[calc(100vw-2rem)] max-w-[900px] max-h-[86dvh] overflow-y-auto',
  'p-0 gap-0 bg-[color:var(--ds-card)] border-[color:var(--ds-line)] rounded-[var(--ds-r-lg)] shadow-[var(--ds-sh2)]',
].join(' ');

function TrustDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG}>
        {/* The heading the dialog is announced by. WhyEmbarko prints its own
            visible "Why Embarko" h2, so this one is for screen readers only —
            two identical visible headings would just be a duplicate. */}
        <DialogTitle className="sr-only">Why Embarko</DialogTitle>
        {/* bg-transparent beats the sections' own surfaces via tailwind-merge;
            see the cn() note in WhyEmbarko.tsx. */}
        <WhyEmbarko
          className="bg-transparent px-9 pb-10 pt-11 max-[640px]:px-6"
          wrapClassName="max-w-none px-0"
          cta={<V2CopyButton />}
        />
        <InfrastructureTrust
          className="border-t border-[color:var(--ds-line)] bg-[color:var(--ds-soft)] px-9 py-10 max-[640px]:px-6"
          wrapClassName="max-w-none px-0"
          cta={<V2CopyButton />}
        />
      </DialogContent>
    </Dialog>
  );
}

function MoreDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG}>
        <DialogTitle className="sr-only">More from Embarko</DialogTitle>
        {/* SiteFooter owns its own top border and py-16; the measure is dropped
            to the dialog's padding so the columns are not centred inside a
            1120px column they do not have room for. */}
        <div className="[&>footer]:border-t-0 [&>footer]:py-10">
          <SiteFooter measure="w-full px-9 max-[640px]:px-6" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── step 0 · hero ─────────────────────────────────────── */

function Hero({ onNext, onTrust }: { onNext: () => void; onTrust: () => void }) {
  return (
    <div className="text-center">
      <h1 className="mx-auto max-w-[16ch] text-[44px] font-extrabold leading-[0.96] tracking-[-0.055em] sm:text-[68px] md:text-[100px] [&_.ds-serif]:pr-[0.06em] [&_.ds-serif]:text-[1.06em]">
        Instant <Serif grad>hosting</Serif> for every app you build with AI
      </h1>

      <Sub>
        No Dockerfile, no config, no deploy pipeline — just a live URL.
      </Sub>

      <button
        onClick={onNext}
        className={buttonClass('glow', 'lg', 'group mt-8')}
      >
        Host now
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      {/* Two-step handoff in the quiet ds steps row; it wraps on phones. */}
      <Steps steps={['Copy deployment prompt', 'Hand it to your agent']} />

      {/* The EU/ISO claim in its one-line form. /v2 is a three-beat deck with
          no room for the full section, and this is the fact worth carrying
          into the first screen anyway. */}
      <div className="mt-7">
        <TrustStrip onClick={onTrust} />
      </div>
    </div>
  );
}

/* ── deploy timeline (step 1's visual) ─────────────────── */

function DeployTimeline() {
  const [elapsed, setElapsed] = useState(STEP3_START + 100);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setElapsed((e) => (e + 100) % CYCLE_MS);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const step2Active = elapsed >= STEP2_START && elapsed < STEP3_START;
  const step3Active = elapsed >= STEP3_START;
  const step1Active = !step2Active && !step3Active;

  const displayLines = LOGS.filter((l) => elapsed >= l.t && elapsed < STEP3_START);

  /* Step 3's URL types in character by character once it takes over, and the
     "it's live" line only appears once typing finishes — the reveal is the
     payoff, not an instant swap. */
  const typeProgress = step3Active ? Math.min(1, (elapsed - STEP3_START) / STEP3_TYPE_MS) : 0;
  const typedUrl = SITE_URL.slice(0, Math.round(typeProgress * SITE_URL.length));
  const urlTypingDone = typeProgress >= 1;
  const liveLineVisible = step3Active && urlTypingDone;

  return (
    <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 items-stretch gap-4 text-left md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {/* Step 1 — Copy prompt */}
      <div
        className={`flex flex-col overflow-hidden ds-card !p-0 flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 ${
          step1Active ? '!border-[color:var(--ds-v1)] shadow-[var(--ds-sh2)]' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 border-b border-[color:var(--ds-line)] px-4 py-3">
          <TrafficLights />
          <span className="ml-2 truncate rounded bg-[color:var(--ds-soft)] px-2 py-0.5 font-mono text-xs text-[color:var(--ds-mute)]">
            embarko.ai
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <span
            className={`font-mono text-xs font-medium transition-colors duration-300 ${
              step1Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-dim)]'
            }`}
          >
            01
          </span>
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--ds-soft)]">
            <Copy className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Copy the prompt</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--ds-mute)]">
            One click on the button above.
          </p>
        </div>
      </div>

      <ArrowRight
        className={`mx-auto hidden h-5 w-5 self-center transition-colors duration-300 md:block ${
          step2Active || step3Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-line2)]'
        }`}
      />
      <ArrowRight
        className={`mx-auto h-5 w-5 rotate-90 transition-colors duration-300 md:hidden ${
          step2Active || step3Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-line2)]'
        }`}
      />

      {/* Step 2 — Give it to your agent */}
      <div
        className={`flex flex-col overflow-hidden ds-card !p-0 flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 ${
          step2Active ? '!border-[color:var(--ds-v1)] shadow-[var(--ds-sh2)]' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 border-b border-[color:var(--ds-line)] px-4 py-3">
          <TrafficLights />
          <span className="ml-2 truncate rounded bg-[color:var(--ds-soft)] px-2 py-0.5 font-mono text-xs text-[color:var(--ds-mute)]">
            your agent
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <span
            className={`font-mono text-xs font-medium transition-colors duration-300 ${
              step2Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-dim)]'
            }`}
          >
            02
          </span>
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--ds-soft)]">
            <Bot className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Give it to your agent</h3>
          <div className="mt-1 h-11 space-y-1 overflow-hidden font-mono text-xs leading-relaxed">
            {displayLines.length === 0 ? (
              <p className="text-[color:var(--ds-dim)]">
                <span className="text-[color:var(--ds-line2)]">{'>'}</span> waiting for prompt...
              </p>
            ) : (
              displayLines.slice(-2).map((log, i, arr) => (
                <p
                  key={log.text}
                  className={`eb-in tabular-nums ${
                    i === arr.length - 1 ? 'font-semibold text-[color:var(--ds-ink)]' : 'text-[color:var(--ds-dim)]'
                  }`}
                >
                  {log.text.startsWith('>') ? (
                    <>
                      <span className="text-[color:var(--ds-dim)]">{'>'}</span> {log.text.slice(2)}
                    </>
                  ) : (
                    log.text
                  )}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <ArrowRight
        className={`mx-auto hidden h-5 w-5 self-center transition-colors duration-300 md:block ${
          step3Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-line2)]'
        }`}
      />
      <ArrowRight
        className={`mx-auto h-5 w-5 rotate-90 transition-colors duration-300 md:hidden ${
          step3Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-line2)]'
        }`}
      />

      {/* Step 3 — Your app is live */}
      <div
        className={`flex flex-col overflow-hidden ds-card !p-0 flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 ${
          step3Active ? '!border-[color:var(--ds-v1)] shadow-[var(--ds-sh2)]' : ''
        }`}
      >
        <div className="flex items-center gap-2 border-b border-[color:var(--ds-line)] px-4 py-3">
          <TrafficLights />
          <span className="ml-2 truncate rounded bg-[color:var(--ds-soft)] px-2 py-0.5 font-mono text-xs text-[color:var(--ds-mute)]">
            {step3Active ? typedUrl : SITE_URL}
            {step3Active && !urlTypingDone && <span className="eb-caret">▍</span>}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <span
            className={`font-mono text-xs font-medium transition-colors duration-300 ${
              step3Active ? 'text-[color:var(--ds-v1)]' : 'text-[color:var(--ds-dim)]'
            }`}
          >
            03
          </span>
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--ds-soft)]">
            <Globe className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Your app is live</h3>
          {liveLineVisible ? (
            <p className="eb-in mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
              Real login, real database, real URL.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--ds-dim)]">
              {step3Active ? 'Deploying...' : 'Waiting for deploy...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* The copy button for screens where copying should not also advance the demo. */
function V2CopyButton() {
  return <PrimaryCta onClicked={() => trackCTA('copy')} />;
}

/* ── step 1 · copy the prompt ──────────────────────────── */

function CopyStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="text-center">
        {/* Same oversized step numeral v1 uses to head each "How?" column. */}
        <StepNumeral n="01" />
        <Heading>Copy the <Serif grad>prompt</Serif></Heading>
        <Sub>This is all your agent needs to know. One prompt, any agent.</Sub>
      </div>

      <div className="mt-8 text-center">
        <PrimaryCta
          /* The demo must reach step 2 even where the clipboard is blocked. */
          onClicked={() => {
            trackCTA('copy');
            setTimeout(onNext, 850);
          }}
        />
      </div>

      <DeployTimeline />
    </div>
  );
}

/* ── step 2 · hand it to whichever agent you use ───────── */

function ChatStep() {
  return (
    <div>
      <div className="text-center">
        <StepNumeral n="02" />
        <Heading>Paste it into your <Serif grad>AI</Serif>, That&apos;s all</Heading>
        <Sub>Your agent runs the deploy itself. You just watch.</Sub>
      </div>

      {/* Same treatment as v1's strip: one row of bare marks under a small
          eyebrow, names carried by alt/title rather than visible labels. */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <p className="ds-kicker mb-0">
          Works with every agent
        </p>
        <ul className="flex max-w-2xl flex-wrap items-center justify-center gap-x-7 gap-y-4">
          {AGENTS.map((agent) => (
            <li key={agent.slug}>
              <img
                src={agentIconSrc(agent.slug)}
                alt={agent.name}
                title={agent.name}
                className="h-5 w-5 object-contain opacity-55 transition hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 text-center">
        <V2CopyButton />
      </div>
    </div>
  );
}
