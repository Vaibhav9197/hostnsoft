'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Lock, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import './v5.css';
import { trackPageView, trackCTA } from '../lib/tracking';
import { DEPLOY_PROMPT } from '../lib/deployPrompt';
import { FEATURES } from '../lib/features';
import { AGENTS, agentIconSrc } from '../lib/agents';
import { SectionSnap } from '../v1/SectionSnap';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ButtonLink, GlowBackdrop, Pill, PrimaryCta, Serif } from '@/app/components/ds';

/* /v5 — v1's grammar (full-screen scenes, big centred type, one serif word,
   the steps that light up on copy), retold as one story:
   understand → act → see it go live → discover depth → imagine → act again.

   One app, Studio Bookings, is the protagonist from the chat demo to the
   capabilities around it. Nothing here is a working product surface: the
   chat and the panels are pictures, so none of them is a link. */

/* Hero copy in one place, so it can be A/B tested without touching layout. */
const HERO = {
  eyebrow: 'Hosting made for the AI era',
  title: <>Put your AI-built app online with <Serif grad>one</Serif> prompt.</>,
  sub: 'Copy the Embarko prompt. Paste it into your AI agent. Get a live URL.',
};

const APP = 'Studio Bookings';
const APP_URL = 'studio-bookings.embarko.app';

/* Display headings: the ds hero weight and tracking, sized per scene. */
const H_DISPLAY = 'font-extrabold leading-[0.98] tracking-[-0.045em]';
const H2 = `${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`;
const SUB = 'mx-auto max-w-[52ch] text-[16px] leading-relaxed text-[var(--ds-mute)] md:text-[19px]';
const SCENE = 'flex min-h-[100dvh] flex-col items-center justify-center px-4 py-20 sm:px-6';

function PageViewTracker() {
  useEffect(() => {
    trackPageView();
  }, []);
  return null;
}

/* ------------------------------------------------------------ prompt box */

/* The first sentence of the prompt's two real lines, without the scheme. The
   rest of the prompt is for the AI, so the box hints at it and the button
   copies all of it. Read from DEPLOY_PROMPT so it can never drift. */
const PREVIEW = (() => {
  const lines = DEPLOY_PROMPT.split('\n').filter(Boolean);
  const first = lines[0].split(' — ')[0].replace(/\.?$/, '.');
  const read = lines[1].replace('https://', '').split('. ')[0] + '.';
  return [first, read];
})();

const STEPS = ['Copy', 'Paste into your AI', 'Get a live URL'];

/* The prompt, the button, and the three steps. Copying completes step 1 and
   lights step 2, which stays lit: the visitor has moved on. */
function PromptBlock() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="v5-prompt">
        <pre>
          {PREVIEW[0]}
          {'\n'}
          {PREVIEW[1]}
          {'\n'}
          <span aria-hidden="true">…</span>
        </pre>
        <div className="v5-prompt-fade" aria-hidden="true" />
        <div className="v5-prompt-foot">
          <small>for your AI agent</small>
          <PrimaryCta size="md" onClicked={() => trackCTA('copy')} onCopied={() => setCopied(true)} />
        </div>
      </div>
      <ol className="v5-steps">
        {STEPS.map((s, i) => {
          const state = i === 0 ? (copied ? 'done' : 'active') : i === 1 && copied ? 'active' : 'idle';
          return (
            <li key={s} className="v5-step" data-state={state}>
              <b>{state === 'done' ? <Check className="size-3.5" aria-label="Done" /> : i + 1}</b>
              {s}
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="mt-4 h-5 text-[14px] font-medium text-[var(--ds-ink)]">
        {copied ? 'Now paste it into your AI agent.' : ''}
      </p>
    </div>
  );
}

/* --------------------------------------------------------- the chat demo */

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  return reduced;
};

/* Each phase adds one line to the chat: reading, deploying, live. */
const PHASE_AT = [600, 1900, 3600];

/* Plays once when it scrolls into view, then waits. "Play again" restarts it. */
function DeployChat() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) {
      setPhase(3);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setPhase(0);
        timers = PHASE_AT.map((at, i) => window.setTimeout(() => setPhase(i + 1), at));
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, [reduced, run]);

  return (
    <div ref={ref} className="v5-chat mx-auto w-full max-w-xl" role="img" aria-label={`An AI agent deploys ${APP} to Embarko and replies with its live URL, ${APP_URL}.`}>
      <div className="v5-chat-top" aria-hidden="true">
        <i /><i /><i />
        <span className="ml-2">Your AI agent</span>
      </div>
      <div className="v5-chat-body" aria-hidden="true">
        <p className="v5-msg v5-msg-me">Deploy this app to Embarko.</p>
        {phase >= 1 && (
          <p className="v5-msg v5-msg-ai v5-in">
            {phase === 1 ? <span className="v5-spin" /> : <Check className="size-4 text-[var(--ok)]" />}
            Reading Embarko&apos;s instructions…
          </p>
        )}
        {phase >= 2 && (
          <p className="v5-msg v5-msg-ai v5-in">
            {phase === 2 ? <span className="v5-spin" /> : <Check className="size-4 text-[var(--ok)]" />}
            Deploying {APP}…
          </p>
        )}
        {phase >= 3 && (
          <div className="v5-live v5-in">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <span className="v5-ping" />
              Your app is live
            </p>
            <p className="mt-1 font-mono text-[14px] text-[var(--ds-mute)] [overflow-wrap:anywhere]">{APP_URL}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--ds-ink)] px-4 py-2 text-[14px] font-semibold text-[var(--ds-card)]">
              Open app <ArrowRight className="size-3.5" />
            </span>
          </div>
        )}
      </div>
      {phase >= 3 && !reduced && (
        <div className="flex justify-end px-5 pb-4">
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--ds-mute)] hover:bg-[var(--ds-soft)] hover:text-[var(--ds-ink)]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------- the protagonist's card */

function StudioBookings({ className = '' }: { className?: string }) {
  return (
    <div className={`v5-app ${className}`} aria-hidden="true">
      <div className="v5-app-shot">
        <h4>{APP}</h4>
        <ul>
          <li><span>Mon 7:00 · Morning flow</span><span>4 spots</span></li>
          <li><span>Wed 18:30 · Slow stretch</span><span>2 spots</span></li>
          <li><span>Sat 9:00 · Power yoga</span><span>Full</span></li>
        </ul>
      </div>
      <p className="mt-3 flex items-center gap-2 px-1 text-[13px]">
        <span className="v5-ping" />
        <span className="font-semibold text-[var(--ok-ink)]">Live</span>
        <span className="min-w-0 truncate font-mono text-[var(--ds-mute)]">{APP_URL}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- scene data */

const AVAILABLE = FEATURES.filter((f) => !f.upcoming);
const UPCOMING = FEATURES.filter((f) => f.upcoming);
const feature = (id: string) => FEATURES.find((f) => f.id === id)!;

/* Short enough to read beside the app; the full words live in features.ts. */
const CAP_LINE: Record<string, string> = {
  domain: 'A link now, your own domain later',
  database: 'Keeps what your app saves',
  tools: 'Your keys, kept out of the code',
  uptime: 'Restarts itself if it stops',
  logs: 'Find what broke, go back a version',
  schedules: 'Runs jobs on a timer',
};

/* Things a person would actually type, each with what it uses. Only working
   features: an upcoming one here would be an instruction that fails. */
const SAYINGS = [
  { say: 'Store customer data.', id: 'database' },
  { say: 'Use my domain.', id: 'domain' },
  { say: 'Run this every morning.', id: 'schedules' },
  { say: 'Keep this API key secure.', id: 'tools' },
  { say: 'Find out why the app failed.', id: 'logs' },
];

const EXAMPLES = [
  'A portfolio',
  'A college project',
  'An internal CRM',
  'A customer portal',
  'A dashboard',
  'A small SaaS',
  'An AI tool',
  'A business website',
];

/* Drawn, not real: a picture of a team's app list. Soft neutrals per
   DESIGN.md, each just a tile colour. */
const TEAM_APPS = [
  ['Sales CRM', 'sales-crm', '#e8dccb'],
  ['HR onboarding', 'hr-onboarding', '#dfe5d6'],
  ['Vendor portal', 'vendor-portal', '#e4dde6'],
  ['Finance dashboard', 'finance', '#d9e2e6'],
  ['Support assistant', 'support', '#efe1d4'],
  ['Internal calculator', 'calc', '#e2e2da'],
  ['Approval tool', 'approvals', '#e6dcd6'],
  ['Team dashboard', 'team-board', '#dde3dc'],
] as const;

/* Each one stands behind a line in app/lib/trust.ts. */
const TRUST = ['Each app isolated', 'HTTPS by default', 'Keys encrypted', 'Every deploy reversible'];

const SHOWN_AGENTS = ['claudecode', 'codex', 'cursor', 'lovable'].map((s) => AGENTS.find((a) => a.slug === s)!);

/* ------------------------------------------------------------------ page */

export default function EmbarkoV5() {
  return (
    /* The header sits outside #v5-scenes: that wrapper has overflow-x-hidden,
       which would stop the header sticking (see /v1). */
    <>
      <PageViewTracker />
      <SiteHeader />

      <div id="v5-scenes" className="overflow-x-hidden bg-background text-foreground antialiased">
        <SectionSnap containerSelector="#v5-scenes" offsetSelector="nav" />

        {/* 1 — THE EXACT ACTION. The whole first screen is the job. */}
        <section className={`relative isolate ${SCENE}`}>
          <GlowBackdrop position="top" />
          <div className="relative z-10 w-full max-w-5xl text-center">
            <Pill grad className="ds-pill-magic mb-6">
              <Sparkles aria-hidden="true" />
              {HERO.eyebrow}
            </Pill>
            <h1 className={`${H_DISPLAY} mx-auto max-w-[15ch] text-[42px] sm:text-6xl md:text-[78px]`}>{HERO.title}</h1>
            <p className={`${SUB} mt-6`}>{HERO.sub}</p>
            <div className="mt-9">
              <PromptBlock />
            </div>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-[var(--ds-mute)]">
              Works with
              {SHOWN_AGENTS.map((a) => (
                <span key={a.slug} className="inline-flex items-center gap-1.5 text-[var(--ds-ink)]">
                  <img src={agentIconSrc(a.slug)} alt="" aria-hidden="true" className="size-3.5" />
                  {a.name}
                </span>
              ))}
              and other AI agents
            </p>
          </div>
        </section>

        {/* 2 — THE MAGIC. No dashboard after the prompt: this is the deploy. */}
        <section className={SCENE} aria-labelledby="v5-magic">
          <div className="w-full max-w-5xl space-y-10 text-center">
            <h2 id="v5-magic" className={H2}>
              Copy. Paste. <Serif grad>Live.</Serif>
            </h2>
            <DeployChat />
            <p className="text-[15px] text-[var(--ds-mute)]">
              That&apos;s the deployment. <span className="font-semibold text-[var(--ds-ink)]">No dashboard to learn.</span>
            </p>
          </div>
        </section>

        {/* 3 — LIVE FIRST, ACCOUNT LATER. The real anonymous-first flow:
            live for 24 hours, kept for good once claimed. */}
        <section className={SCENE} aria-labelledby="v5-first">
          <div className="w-full max-w-5xl space-y-12 text-center">
            <div className="space-y-5">
              <h2 id="v5-first" className={H2}>
                Live first. Sign up <Serif grad>later.</Serif>
              </h2>
              <p className={SUB}>Your first app goes live before you make an account. Keep it when you want to.</p>
            </div>
            <ol className="mx-auto grid max-w-4xl gap-4 text-left sm:grid-cols-3">
              {[
                ['Live now', 'Your AI sends you the link. It stays up for 24 hours.'],
                ['Keep it', 'Give your AI your email. Embarko sends back what it needs.'],
                ['Yours for good', 'The app stays online, in your account, ready for more.'],
              ].map(([title, body], i) => (
                <li key={title} className="rounded-[var(--ds-r)] border border-[var(--ds-line)] bg-[var(--ds-card)] p-5 shadow-[var(--ds-sh)]">
                  <span className="font-mono text-[13px] text-[var(--ds-dim)]">0{i + 1}</span>
                  <p className="mt-3 text-lg font-semibold tracking-tight">{title}</p>
                  <p className="mt-1 text-[15px] text-[var(--ds-mute)]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 — MORE THAN HOSTING. The same app, with what it can use around
            it. Working now and coming next never share a row. */}
        <section className={SCENE} aria-labelledby="v5-more">
          <div className="w-full max-w-5xl space-y-10 text-center">
            <div className="space-y-5">
              <h2 id="v5-more" className={H2}>
                Not just a link. A real app that <Serif grad>keeps</Serif> working.
              </h2>
              <p className={SUB}>Your AI gets what the app needs. You don&apos;t set it up.</p>
            </div>
            <div className="v5-orbit">
              {[AVAILABLE.slice(0, 3), null, AVAILABLE.slice(3, 6)].map((group, gi) =>
                group ? (
                  <ul key={gi} aria-label="Working today">
                    {group.map((f) => (
                      <li key={f.id} className="v5-cap">
                        <f.Icon strokeWidth={1.75} aria-hidden="true" />
                        <p>
                          <strong>{f.label}</strong>
                          <span>{CAP_LINE[f.id] ?? f.headline}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <StudioBookings key="app" />
                ),
              )}
            </div>
            <div className="space-y-3">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--ds-dim)]">Coming next</p>
              <ul className="v5-soon">
                {UPCOMING.map((f) => (
                  <li key={f.id}>
                    <f.Icon strokeWidth={1.75} aria-hidden="true" />
                    {f.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 5 — THE AI IS THE INTERFACE. What you say → what the app uses. */}
        <section className={SCENE} aria-labelledby="v5-say">
          <div className="w-full max-w-4xl space-y-10 text-center">
            <h2 id="v5-say" className={H2}>
              Tell your AI what the app <Serif grad>needs.</Serif>
            </h2>
            <ul className="v5-say">
              {SAYINGS.map(({ say, id }) => {
                const f = feature(id);
                return (
                  <li key={say}>
                    <q>{say}</q>
                    <span>
                      <f.Icon strokeWidth={1.75} aria-hidden="true" />
                      {f.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[17px] text-[var(--ds-mute)]">
              Your AI uses Embarko. <span className="font-semibold text-[var(--ds-ink)]">You don&apos;t configure the cloud.</span>
            </p>
          </div>
        </section>

        {/* 6 — WHAT CAN LIVE HERE. v1's big words, so a visitor sees their project. */}
        <section className={SCENE} aria-labelledby="v5-what">
          <div className="w-full max-w-5xl space-y-12 text-center">
            <div className="space-y-5">
              <h2 id="v5-what" className={H2}>
                From a personal site to a full <Serif grad>agentic</Serif> app.
              </h2>
              <p className={SUB}>If your AI can build it, Embarko gives it somewhere to run.</p>
            </div>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {EXAMPLES.map((e, i) => (
                <li key={e} className={i % 2 ? 'text-[var(--ds-mute)]' : ''}>
                  {e}
                </li>
              ))}
              <li className="basis-full text-[var(--ds-ink)]">
                An app with its own UI, AI and <Serif>data</Serif>
              </li>
            </ul>
            <Link
              href="/use-cases"
              className="group inline-flex items-center gap-1.5 text-base font-medium text-[var(--ds-ink)] underline decoration-[var(--ds-line)] underline-offset-4 transition hover:decoration-current md:text-lg"
            >
              See more use cases
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* 7 — TEAMS. One app needs hosting; fifty need a home. */}
        <section className={SCENE} aria-labelledby="v5-team">
          <div className="w-full max-w-4xl space-y-10 text-center">
            <div className="space-y-5">
              <h2 id="v5-team" className={H2}>
                One <Serif grad>home</Serif> for everything your team builds with AI.
              </h2>
              <p className={SUB}>Deploy apps. Find them later. Keep them running — without a DevOps project for every small tool.</p>
            </div>
            <div className="v5-team" aria-hidden="true">
              <div className="v5-team-head">
                <span className="text-[17px] font-semibold">Your apps</span>
                <span className="text-[13px] text-[var(--ds-mute)]">8 live</span>
              </div>
              <ul>
                {TEAM_APPS.map(([name, slug, tint]) => (
                  <li key={slug}>
                    <i style={{ background: tint }} />
                    <p>
                      <strong>{name}</strong>
                      <span>{slug}.embarko.app</span>
                    </p>
                    <em>
                      <span className="v5-ping" />
                      Live
                    </em>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <ButtonLink href="/pricing" size="lg">See team plans</ButtonLink>
            </div>
          </div>
        </section>

        {/* 8 — TRUST, KEPT SHORT. The detail lives on /security. */}
        <section className={SCENE} aria-labelledby="v5-trust">
          <div className="w-full max-w-4xl space-y-10 text-center">
            <h2 id="v5-trust" className={H2}>
              Built to run real apps <Serif grad>safely.</Serif>
            </h2>
            <ul className="v5-trust">
              {TRUST.map((t, i) => (
                <li key={t}>
                  {i === 2 ? <Lock aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/security"
              className="group inline-flex items-center gap-1.5 text-base font-medium text-[var(--ds-ink)] underline decoration-[var(--ds-line)] underline-offset-4 transition hover:decoration-current"
            >
              Read about security
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* FINAL — back to the exact action, the same box as the opening.
            The footer rides in this scene, as on /v1. */}
        <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 pt-20 sm:px-6" aria-labelledby="v5-end">
          <GlowBackdrop />
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-3xl space-y-8 text-center">
              <div className="space-y-5">
                <h2 id="v5-end" className={`${H_DISPLAY} text-5xl sm:text-6xl md:text-7xl`}>
                  Already built <Serif grad>something?</Serif>
                </h2>
                <p className={SUB}>{HERO.sub}</p>
              </div>
              <PromptBlock />
            </div>
          </div>
          <div className="relative z-10 -mx-4 sm:-mx-6">
            <SiteFooter />
          </div>
        </section>
      </div>
    </>
  );
}
