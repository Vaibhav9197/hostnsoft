'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Copy, Bot, Globe } from 'lucide-react';
import { AGENTS, agentIconSrc } from '../lib/agents';
import { CopyPromptButton, COPIED_LABEL } from '../components/CopyPromptButton';
import { trackPageView, trackCTA, trackDeployment } from '../lib/tracking';
import { SiteHeader } from '../components/SiteHeader';

/* Looping "watch it deploy" timeline shown on step 1. A single elapsed-ms
   counter drives every derived phase, rather than nested timers, so the whole
   sequence stays deterministic and easy to re-time. Disabled under
   prefers-reduced-motion — see the effect in DeployTimeline. */
const CYCLE_MS = 7000;
const STEP2_START = 1400;
const LIVE_COUNT_START = 3900;
const STEP3_START = 4300;
const STEP3_TYPE_MS = 1000;
const SITE_URL = 'your-app.embarko.ai';
const LOGS = [
  { t: 1400, text: '> deploy this app to embarko' },
  { t: 2100, text: 'Installing dependencies...' },
  { t: 2800, text: 'Building...' },
  { t: 3500, text: 'Provisioning database...' },
];

const STEPS = ['Start', 'Copy', 'Paste'];

/* ── shared bits ───────────────────────────────────────── */

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-5 text-[46px] font-semibold leading-[0.95] tracking-[-0.04em] sm:text-[68px] md:text-[100px]">
      {children}
    </h2>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-6 max-w-[46ch] text-[18px] leading-relaxed text-black/50 md:text-[22px]">
      {children}
    </p>
  );
}

function StepNumeral({ n }: { n: string }) {
  return <div className="text-6xl font-bold leading-none text-gray-300">{n}</div>;
}

/* Headline highlight: a solid black chip behind a phrase. box-decoration-break
   keeps the padding and radius on every fragment when a phrase wraps. */
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-[0.09em] bg-black px-[0.11em] pb-[0.06em] pt-[0.02em] align-baseline text-white leading-[0.88] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
      {children}
    </span>
  );
}

function TrafficLights() {
  return (
    <div className="flex gap-1.5">
      <span className="h-[9px] w-[9px] rounded-full bg-[#ff5f57]" />
      <span className="h-[9px] w-[9px] rounded-full bg-[#febc2e]" />
      <span className="h-[9px] w-[9px] rounded-full bg-[#28c840]" />
    </div>
  );
}

/* ── page ──────────────────────────────────────────────── */

export default function EmbarkoV2() {
  const [step, setStep] = useState(0);

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
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-black antialiased">
      <SiteHeader />

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
          className="absolute left-1/2 bottom-8 z-20 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-black/5 text-black/60 transition hover:bg-black/10 hover:text-black"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* the one section */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12">
        <div
          key={step}
          /* Hero's headline needs a wider column than the demo steps to hold two lines. */
          className={`eb-in w-full ${step === 0 ? 'max-w-[1180px]' : 'max-w-[1000px]'}`}
        >
          {step === 0 && <Hero onNext={() => setStep(1)} />}
          {step === 1 && <CopyStep onNext={() => setStep(2)} />}
          {step === 2 && <ChatStep />}
        </div>
      </div>

    </main>
  );
}

/* ── step 0 · hero ─────────────────────────────────────── */

function Hero({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <h1 className="mx-auto max-w-[18ch] text-[52px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[74px] md:text-[100px]">
        Instant <Mark>hosting</Mark> for every app you build with AI
      </h1>

      <Sub>
        No Dockerfile, no config, no deploy pipeline — just a live URL.
      </Sub>

      <button
        onClick={onNext}
        className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-black px-8 py-4 text-[16px] font-medium text-white transition hover:bg-black/85"
      >
        Host now
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      {/* Two-step handoff, mirroring the numbered steps on the other versions.
          The numerals need leading-none plus a 1px bottom pad: digits carry no
          descender, so box-centring alone leaves them sitting visibly low. */}
      <ol
        aria-label="How it works"
        className="mt-5 flex list-none items-center justify-center gap-4 text-[14px] font-medium text-black/40"
      >
        <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center pb-px rounded-full border border-black/15 text-[11px] font-semibold leading-none tabular-nums">1</span>
          Copy the prompt
        </li>
        <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center pb-px rounded-full border border-black/15 text-[11px] font-semibold leading-none tabular-nums">2</span>
          Hand it to your agent
        </li>
      </ol>
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

  /* The final log line counts up live ("Live in 0.0s" -> "4.1s") instead of
     appearing as static text, timed to land exactly as step 3 takes over. */
  const visibleLogs = LOGS.filter((l) => elapsed >= l.t && elapsed < STEP3_START);
  const liveCounterActive = elapsed >= LIVE_COUNT_START && elapsed < STEP3_START;
  const liveSeconds = (
    ((Math.min(elapsed, STEP3_START) - LIVE_COUNT_START) / (STEP3_START - LIVE_COUNT_START)) * 4.1
  ).toFixed(1);
  const displayLines = liveCounterActive
    ? [...visibleLogs, { t: LIVE_COUNT_START, text: `Live in ${liveSeconds}s` }]
    : visibleLogs;

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
        className={`flex flex-col overflow-hidden rounded-xl border transition-colors duration-300 ${
          step1Active ? 'border-neutral-950' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-1.5 border-b border-neutral-200 px-4 py-3">
          <TrafficLights />
          <span className="ml-2 truncate rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
            embarko.ai
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <span
            className={`text-xs font-semibold transition-colors duration-300 ${
              step1Active ? 'text-neutral-950' : 'text-neutral-400'
            }`}
          >
            01
          </span>
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Copy className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Copy the prompt</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            One click on the button above.
          </p>
        </div>
      </div>

      <ArrowRight
        className={`mx-auto hidden h-5 w-5 self-center transition-colors duration-300 md:block ${
          step2Active || step3Active ? 'text-neutral-950' : 'text-neutral-300'
        }`}
      />
      <ArrowRight
        className={`mx-auto h-5 w-5 rotate-90 transition-colors duration-300 md:hidden ${
          step2Active || step3Active ? 'text-neutral-950' : 'text-neutral-300'
        }`}
      />

      {/* Step 2 — Give it to your agent */}
      <div
        className={`flex flex-col overflow-hidden rounded-xl border transition-colors duration-300 ${
          step2Active ? 'border-neutral-950' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-1.5 border-b border-neutral-200 px-4 py-3">
          <TrafficLights />
          <span className="ml-2 truncate rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
            your agent
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <span
            className={`text-xs font-semibold transition-colors duration-300 ${
              step2Active ? 'text-neutral-950' : 'text-neutral-400'
            }`}
          >
            02
          </span>
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Bot className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Give it to your agent</h3>
          <div className="mt-1 h-11 space-y-1 overflow-hidden font-mono text-xs leading-relaxed">
            {displayLines.length === 0 ? (
              <p className="text-neutral-400">
                <span className="text-neutral-300">{'>'}</span> waiting for prompt...
              </p>
            ) : (
              displayLines.slice(-2).map((log, i, arr) => (
                <p
                  key={log.text}
                  className={`eb-in tabular-nums ${
                    i === arr.length - 1 ? 'font-semibold text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  {log.text.startsWith('>') ? (
                    <>
                      <span className="text-neutral-400">{'>'}</span> {log.text.slice(2)}
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
          step3Active ? 'text-neutral-950' : 'text-neutral-300'
        }`}
      />
      <ArrowRight
        className={`mx-auto h-5 w-5 rotate-90 transition-colors duration-300 md:hidden ${
          step3Active ? 'text-neutral-950' : 'text-neutral-300'
        }`}
      />

      {/* Step 3 — Your app is live */}
      <div
        className={`flex flex-col overflow-hidden rounded-xl border transition-colors duration-300 ${
          step3Active ? 'border-neutral-950' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <TrafficLights />
          <span className="ml-2 truncate rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
            {step3Active ? typedUrl : SITE_URL}
            {step3Active && !urlTypingDone && <span className="eb-caret">▍</span>}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <span
            className={`text-xs font-semibold transition-colors duration-300 ${
              step3Active ? 'text-neutral-950' : 'text-neutral-400'
            }`}
          >
            03
          </span>
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Globe className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Your app is live</h3>
          {liveLineVisible ? (
            <p className="eb-in mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
              Real login, real database, real URL.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              {step3Active ? 'Deploying...' : 'Waiting for deploy...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── step 1 · copy the prompt ──────────────────────────── */

function CopyStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="text-center">
        {/* Same oversized step numeral v1 uses to head each "How?" column. */}
        <StepNumeral n="01" />
        <Heading>Copy the prompt</Heading>
        <Sub>This is all your agent needs to know. One prompt, any agent.</Sub>
      </div>

      <div className="mt-8 text-center">
        <CopyPromptButton
          /* The demo must reach step 2 even where the clipboard is blocked. */
          onClicked={() => {
            trackCTA('copy');
            setTimeout(onNext, 850);
          }}
          className="inline-flex items-center gap-2.5 rounded-full bg-black px-8 py-4 text-[16px] font-medium text-white transition hover:bg-black/85"
          copiedClassName="inline-flex items-center gap-2.5 rounded-full bg-[#16a34a] px-8 py-4 text-[16px] font-medium text-white transition"
          copiedChildren={
            <>
              {COPIED_LABEL}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-75">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </>
          }
        >
          Copy prompt
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-75">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </CopyPromptButton>
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
        <Heading>Paste it into your AI, That's all</Heading>
        <Sub>Your agent runs the deploy itself. You just watch.</Sub>
      </div>

      {/* Same treatment as v1's strip: one row of bare marks under a small
          eyebrow, names carried by alt/title rather than visible labels. */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-black/35">
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


    </div>
  );
}
