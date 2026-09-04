'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Copy, Bot, Globe } from 'lucide-react';
import { CopyPromptButton, COPIED_LABEL } from '../components/CopyPromptButton';

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

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-black antialiased">
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
          className="absolute left-6 top-6 z-20 flex h-9 w-9 items-center justify-center rounded-full text-black/35 transition hover:bg-black/[0.04] hover:text-black"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* the one section */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12">
        <div key={step} className="eb-in w-full max-w-[1000px]">
          {step === 0 && <Hero onNext={() => setStep(1)} />}
          {step === 1 && <CopyStep onNext={() => setStep(2)} />}
          {step === 2 && <ChatStep />}
        </div>
      </div>

      {/* step indicator */}
      <div className="flex shrink-0 items-center justify-center gap-2 pb-8">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            aria-label={label}
            aria-current={i === step ? 'step' : undefined}
            disabled={i > step}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === step
                ? 'w-7 bg-black'
                : i < step
                  ? 'w-1.5 bg-black/25 hover:bg-black/50'
                  : 'w-1.5 bg-black/10'
            }`}
          />
        ))}
      </div>
    </main>
  );
}

/* ── step 0 · hero ─────────────────────────────────────── */

function Hero({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-black">
        <div className="h-3 w-3 rounded-full bg-white" />
      </div>

      <h1 className="mx-auto max-w-[13ch] text-[52px] font-semibold leading-[0.94] tracking-[-0.045em] sm:text-[74px] md:text-[100px]">
        Your agent builds it. Embarko ships it.
      </h1>

      <Sub>
        Instant hosting for anything you build with your AI agent. No Dockerfile, no config, no
        deploy pipeline — just a live URL.
      </Sub>

      <button
        onClick={onNext}
        className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-black px-8 py-4 text-[16px] font-medium text-white transition hover:bg-black/85"
      >
        Start now
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <div className="mt-5 text-[14px] text-black/35">It takes minutes to live</div>
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
        <Heading>Copy the prompt</Heading>
        <Sub>This is all your agent needs to know. One prompt, any agent.</Sub>
      </div>

      <div className="mt-8 text-center">
        <CopyPromptButton
          /* The demo must reach step 2 even where the clipboard is blocked. */
          onClicked={() => setTimeout(onNext, 850)}
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

/* Display only — these name the agents the prompt is known to work with;
   nothing here is clickable. Icons live in public/agenticons. */
const AGENTS = [
  { slug: 'claudecode', name: 'Claude Code' },
  { slug: 'cursor', name: 'Cursor' },
  { slug: 'githubcopilot', name: 'GitHub Copilot' },
  { slug: 'codex', name: 'Codex' },
  { slug: 'gemini', name: 'Gemini' },
  { slug: 'antigravity', name: 'Antigravity' },
  { slug: 'cline', name: 'Cline' },
  { slug: 'opencode', name: 'OpenCode' },
  { slug: 'openclaw', name: 'OpenClaw' },
  { slug: 'lovable', name: 'Lovable' },
  { slug: 'grokbot', name: 'Grok' },
  { slug: 'perplexity', name: 'Perplexity' },
  { slug: 'hermes', name: 'Hermes' },
  { slug: 'pi', name: 'Pi' },
];

function ChatStep() {
  return (
    <div>
      <div className="text-center">
        <Heading>Paste it into your AI</Heading>
        <Sub>Your agent runs the deploy itself. You just watch.</Sub>
      </div>

      <ul className="mx-auto mt-12 flex max-w-[820px] flex-wrap items-center justify-center gap-2.5">
        {AGENTS.map((agent) => (
          <li
            key={agent.slug}
            className="flex items-center gap-2.5 rounded-full border border-black/10 bg-white px-4 py-2.5"
          >
            <img
              src={`/agenticons/agenticon-${agent.slug}.svg`}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span className="whitespace-nowrap text-[14px] font-medium text-black/70">
              {agent.name}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-[15px] text-black/35">
        One prompt, any agent — the deploy runs the same either way.
      </p>
    </div>
  );
}
