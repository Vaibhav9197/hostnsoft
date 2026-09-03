'use client';

import { useState, useEffect, useRef } from 'react';

const AGENT_PROMPT = `Deploy this project to Embarko.

Run \`npx embarko deploy\` from the project root.
Embarko detects the build automatically — no Dockerfile,
no config. It prints a live URL when it's done.`;

/* What the agent reports back, one line at a time, inside the chat. */
const AGENT_STEPS = [
  'Reading your project',
  'Detected framework: Next.js',
  'Building your app',
  'Provisioning database and file storage',
  'Assigning your URL',
];

const STEPS = ['Start', 'Copy', 'Paste', 'Live'];

/* ── shared bits ───────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-medium uppercase tracking-[0.22em] text-black/35 md:text-[13px]">
      {children}
    </div>
  );
}

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
          {step === 2 && <ChatStep onNext={() => setStep(3)} />}
          {step === 3 && <LiveStep onRestart={() => setStep(0)} />}
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
        See how it works
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <div className="mt-5 text-[14px] text-black/35">Takes 30 seconds</div>
    </div>
  );
}

/* ── step 1 · copy the prompt ──────────────────────────── */

function CopyStep({ onNext }: { onNext: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
    } catch {
      /* clipboard blocked — the demo continues regardless */
    }
    setCopied(true);
    setTimeout(onNext, 850);
  };

  return (
    <div>
      <div className="text-center">
        <Eyebrow>Step 1 of 3</Eyebrow>
        <Heading>Copy the prompt</Heading>
        <Sub>This is all your agent needs to know. One prompt, any agent.</Sub>
      </div>

      <div className="mx-auto mt-10 max-w-[680px] overflow-hidden rounded-[14px] border border-black/10 bg-black/[0.02]">
        <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-black/35">
            embarko.prompt
          </span>
          <TrafficLights />
        </div>
        <pre className="whitespace-pre-wrap px-5 py-5 font-mono text-[13px] leading-relaxed text-black/70">
          {AGENT_PROMPT}
        </pre>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={copy}
          className={`inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[16px] font-medium transition ${
            copied ? 'bg-[#16a34a] text-white' : 'bg-black text-white hover:bg-black/85'
          }`}
        >
          {copied ? 'Copied' : 'Copy prompt'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-75">
            {copied ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── step 2 · the agent does everything ────────────────── */

type Phase = 'pasting' | 'ready' | 'working' | 'done';

function ChatStep({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<Phase>('pasting');
  const [visible, setVisible] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  // The prompt "drops in" on its own, so the gesture reads clearly.
  useEffect(() => {
    const id = setTimeout(() => setPhase('ready'), 600);
    return () => clearTimeout(id);
  }, []);

  // Keep the newest agent line in view as they stack up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible, phase]);

  const send = () => {
    setPhase('working');
    const timers: ReturnType<typeof setTimeout>[] = [];

    AGENT_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 700 + i * 750));
    });

    const after = 700 + AGENT_STEPS.length * 750;
    timers.push(setTimeout(() => setPhase('done'), after));
    timers.push(setTimeout(() => onNextRef.current(), after + 1800));

    // Cleared if the user steps back mid-run.
    cleanupRef.current = () => timers.forEach(clearTimeout);
  };

  useEffect(() => () => cleanupRef.current(), []);

  const started = phase === 'working' || phase === 'done';

  return (
    <div>
      <div className="text-center">
        <Eyebrow>Step 2 of 3</Eyebrow>
        <Heading>Paste it into your AI</Heading>
        <Sub>Your agent runs the deploy itself. You just watch.</Sub>
      </div>

      {/* mock agent chat — this is where the whole deploy happens */}
      <div className="mx-auto mt-10 max-w-[680px] overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 border-b border-black/[0.07] px-4 py-3">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="text-[13px] font-medium text-black/60">Your AI assistant</span>
        </div>

        <div ref={scrollRef} className="h-[300px] overflow-y-auto px-4 py-4">
          {!started ? (
            <div className="rounded-[12px] border border-black/10 bg-black/[0.02] px-4 py-3.5">
              <pre
                className={`whitespace-pre-wrap font-mono text-[12px] leading-relaxed transition-opacity duration-500 ${
                  phase === 'ready' ? 'text-black/70 opacity-100' : 'opacity-0'
                }`}
              >
                {AGENT_PROMPT}
              </pre>
              {phase === 'pasting' && (
                <div className="font-mono text-[12px] text-black/30">
                  <span className="eb-caret">▋</span> Paste here
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* what you sent */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-[12px] bg-black px-4 py-3 font-mono text-[12px] leading-relaxed text-white/90">
                  Deploy this project to Embarko.
                </div>
              </div>

              {/* what the agent does */}
              <div className="space-y-2 pt-1">
                {AGENT_STEPS.slice(0, visible).map((line, i) => {
                  const finished = i < visible - 1 || phase === 'done';
                  return (
                    <div key={line} className="eb-in flex items-center gap-2.5 text-[13.5px]">
                      {finished ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#16a34a]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="eb-spin h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-black/15 border-t-black/60" />
                      )}
                      <span className={finished ? 'text-black/50' : 'text-black/75'}>{line}</span>
                    </div>
                  );
                })}
              </div>

              {phase === 'done' && (
                <div className="eb-in rounded-[12px] border border-[#16a34a]/25 bg-[#16a34a]/[0.07] px-4 py-3.5">
                  <div className="text-[13.5px] font-medium text-[#16a34a]">
                    Done — deployed in 3.2s
                  </div>
                  <div className="mt-1 font-mono text-[12.5px] text-black/60">
                    https://yourapp.embarko.app
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-black/[0.07] px-4 py-3">
          <span className="text-[12.5px] text-black/30">
            {phase === 'pasting' && 'Pasting…'}
            {phase === 'ready' && 'Ready to send'}
            {phase === 'working' && 'Your agent is deploying…'}
            {phase === 'done' && 'Deployed'}
          </span>
          <button
            onClick={send}
            disabled={phase !== 'ready'}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-black/85 disabled:opacity-25"
          >
            Send
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── step 3 · it's live ────────────────────────────────── */

function LiveStep({ onRestart }: { onRestart: () => void }) {
  return (
    <div>
      <div className="text-center">
        <Eyebrow>Step 3 of 3</Eyebrow>
        <Heading>It&rsquo;s live.</Heading>
        <Sub>A real URL you can share, with a database and file storage already attached.</Sub>
      </div>

      <div className="mx-auto mt-10 max-w-[680px] overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.09)]">
        <div className="flex items-center gap-2.5 border-b border-black/10 px-3.5 py-2.5">
          <TrafficLights />
          <div className="ml-2 flex flex-1 items-center gap-2 truncate rounded-full bg-black/[0.05] px-3 py-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-[#16a34a]">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="truncate font-mono text-[11.5px] text-black/50">
              yourapp.embarko.app
            </span>
          </div>
        </div>

        <div className="flex h-[180px] flex-col items-center justify-center gap-3">
          <div className="text-[16px] font-medium text-black/70">Your app</div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#16a34a]/10 px-3 py-1 text-[12px] font-medium text-[#16a34a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
            Live
          </div>
        </div>
      </div>

      <div className="mt-9 text-center">
        <a
          href="/app"
          className="group inline-flex items-center gap-2.5 rounded-full bg-black px-9 py-4 text-[16px] font-medium text-white transition hover:bg-black/85"
        >
          Start now
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
        <div className="mt-5">
          <button
            onClick={onRestart}
            className="text-[14px] text-black/35 transition hover:text-black/70"
          >
            Replay the demo
          </button>
        </div>
      </div>
    </div>
  );
}
