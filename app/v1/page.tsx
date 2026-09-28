'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import { MapPin, Plane } from 'lucide-react';
import barcelonaMorning from '../v4/barcelona-morning.png';
import { SectionSnap } from './SectionSnap';
import { trackPageView, trackCTA, trackDeployment } from '../lib/tracking';
import { AGENTS, agentIconSrc } from '../lib/agents';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Card, GlowBackdrop, PrimaryCta, Serif, Steps as DsSteps } from '@/app/components/ds';
import { FeatureShowcase } from '../components/FeatureShowcase';
import { InfrastructureTrust, WhyEmbarko } from '../components/WhyEmbarko';

/* The highlight on an app's address, wherever it appears — the local build and
   the deployed URL both wear it, so one definition keeps the chip identical
   across all four places it shows up. */
const URL_CHIP =
  'rounded-full bg-[var(--ds-soft)] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[var(--ds-mute)] ring-1 ring-[var(--ds-line)]';

/* Display headings: the ds hero weight and tracking, sized per scene. */
const H_DISPLAY = 'font-extrabold leading-[0.98] tracking-[-0.045em]';

/** A miniature application window. The product is the visual, so these are drawn, not photographed. */
function AppWindow({
  label,
  children,
  className = '',
  /* The colour lives in a prop rather than the base classes so a caller can
     replace it outright — two competing text- utilities in one string are
     resolved by CSS source order, not by the order they are written. */
  labelClassName = 'text-[var(--ds-dim)]',
  style,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--ds-r)] border border-[var(--ds-line)] bg-[var(--ds-card)] shadow-[var(--ds-sh2)] ${className}`}
      style={style}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--ds-line)] bg-[var(--ds-soft)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[var(--ds-line2)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--ds-line2)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--ds-line2)]" />
        {label ? (
          <span className={`ml-2 truncate rounded text-[10px]  tracking-wide ${labelClassName}`}>
            {label}
          </span>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Modest rounding, not rounded-full: square-ish elements (calculator keys, chart
// bars) turn into circles at full rounding and stop reading as UI.
//
// The colour comes from --sk, set per card so each sketch picks up its app's
// tint. The fallback keeps the untinted sketches (the drifting sky windows)
// looking as they did.
const bar = 'rounded-[4px] bg-[var(--sk,rgba(0,0,0,0.07))]';

/** Abstract UI sketches — enough shape to read as a real app, not enough to become a feature card. */
function Sketch({ variant }: { variant: string }) {
  switch (variant) {
    case 'portfolio':
      return (
        <div className="space-y-2">
          <div className={`${bar} h-12 w-full`} />
          <div className="grid grid-cols-3 gap-2">
            <div className={`${bar} h-8`} />
            <div className={`${bar} h-8`} />
            <div className={`${bar} h-8`} />
          </div>
        </div>
      );
    case 'site':
      return (
        <div className="space-y-2">
          <div className={`${bar} h-2 w-1/3`} />
          <div className={`${bar} h-2 w-3/4`} />
          <div className={`${bar} h-2 w-2/3`} />
          <div className={`${bar} h-10 w-full`} />
        </div>
      );
    case 'cv':
      return (
        <div className="flex gap-3">
          <div className={`${bar} h-10 w-10 shrink-0 !rounded-full`} />
          <div className="flex-1 space-y-2 pt-1">
            <div className={`${bar} h-2 w-2/3`} />
            <div className={`${bar} h-2 w-1/2`} />
            <div className={`${bar} h-2 w-3/4`} />
          </div>
        </div>
      );
    case 'ai':
      return (
        <div className="space-y-2">
          <div className={`${bar} ml-auto h-6 w-2/3`} />
          <div className={`${bar} h-6 w-3/4`} />
          <div className={`${bar} ml-auto h-4 w-1/3`} />
        </div>
      );
    case 'expense':
      return (
        <div className="flex h-[68px] items-end gap-1.5">
          {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
            <div key={i} className={`${bar} flex-1`} style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case 'habit':
      return (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-[3px] bg-[var(--sk,rgba(0,0,0,0.16))] ${
                i % 3 === 0 ? 'opacity-100' : 'opacity-30'
              }`}
            />
          ))}
        </div>
      );
    case 'quiz':
      return (
        <div className="space-y-2">
          <div className={`${bar} h-2 w-3/4`} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border border-black/15" />
              <div className={`${bar} h-2 flex-1`} />
            </div>
          ))}
        </div>
      );
    case 'calc':
      return (
        <div className="space-y-2">
          <div className={`${bar} h-6 w-full`} />
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${bar} aspect-square`} />
            ))}
          </div>
        </div>
      );
    case 'game':
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-[3px] bg-[var(--sk,rgba(0,0,0,0.14))] ${
                [0, 4, 8, 2].includes(i) ? 'opacity-100' : 'opacity-25'
              }`}
            />
          ))}
        </div>
      );
    default:
      return <div className={`${bar} h-16 w-full`} />;
  }
}

/* Every sketch variant's colour, in one table: `panel` is the wash behind the
   sketch, `ink` the shapes on it (fed to the sketches as --sk). Shared by the
   example cards and the floating windows so the two can't drift apart. */
const TINTS: Record<string, { panel: string; ink: string }> = {
  portfolio: { panel: '#f7eee1', ink: '#d8b489' },
  site: { panel: '#eaf5ee', ink: '#a3c9b1' },
  cv: { panel: '#f3f2ee', ink: '#bcc4b6' },
  ai: { panel: '#ecf2fa', ink: '#a6bde0' },
  expense: { panel: '#faeae3', ink: '#e0ab96' },
  habit: { panel: '#eaf5ee', ink: '#8fc3a6' },
  quiz: { panel: '#f1eff8', ink: '#b6b1da' },
  calc: { panel: '#f3f2ee', ink: '#c0c0b8' },
  game: { panel: '#e9f0f4', ink: '#93aebd' },
};

/** The tinted panel a sketch sits on — the look the example cards established. */
function SketchPanel({ variant, className = '' }: { variant: string; className?: string }) {
  const tint = TINTS[variant] ?? TINTS.portfolio;
  return (
    <div
      className={`flex flex-col justify-center overflow-hidden rounded-[12px] ${className}`}
      style={{ backgroundColor: tint.panel, '--sk': tint.ink } as CSSProperties}
    >
      <Sketch variant={variant} />
    </div>
  );
}

const APPS = [
  { title: 'Portfolio', desc: 'Show your work.', variant: 'portfolio' },
  { title: 'Personal website', desc: 'Your own corner of the internet.', variant: 'site' },
  { title: 'Interactive CV', desc: 'More than a PDF.', variant: 'cv' },
  { title: 'AI tool', desc: 'Turn an idea into something people can use.', variant: 'ai' },
  { title: 'Expense tracker', desc: 'Your money. Your app.', variant: 'expense' },
  { title: 'Habit planner', desc: 'Build the tool you wish existed.', variant: 'habit' },
];

/**
 * The scattered "world of apps" scene, ported from /v4.
 *
 * v4 draws this from v4.css, which its own layout imports precisely so it stays
 * off the other variants — that file restyles bare `html`, `body` and `h1`, so
 * it cannot simply be shared. The composition is reproduced here in v1's own
 * Tailwind idiom instead: same cards, same scatter, same window sketches.
 */
const WORLD_THEMES: Record<string, { bg: string; art: ReactNode }> = {
  sunrise: {
    bg: '#f4e8d7',
    art: (
      <>
        <i className="absolute right-[15px] top-[15px] h-[26px] w-[26px] rounded-full bg-[#e2a14a]" />
        <i className="absolute bottom-[18px] left-3 h-[5px] w-[78px] rounded-[4px] bg-[#5b5044]" />
        <i className="absolute bottom-[9px] left-3 h-1 w-[55px] rounded-[4px] bg-[#a28b75]" />
      </>
    ),
  },
  mint: {
    bg: '#e6f4eb',
    art: (
      <>
        <i className="absolute left-[17px] top-[19px] h-[7px] w-[73px] rounded-[5px] bg-[#91c2a1]" />
        <i className="absolute left-[17px] top-[38px] h-[25px] w-[112px] rounded-[5px] bg-[#c5dfcc]" />
        <i className="absolute bottom-[13px] left-[17px] h-[6px] w-[41px] rounded-[5px] bg-[#91c2a1]" />
      </>
    ),
  },
  paper: {
    bg: '#f1f0ec',
    art: (
      <>
        <i className="absolute left-[26px] top-[17px] h-[52px] w-[5px] rounded-[4px] bg-[#91a88f]" />
        <i className="absolute left-[52px] top-[17px] h-[36px] w-[5px] rounded-[4px] bg-[#91a88f]" />
        <i className="absolute left-[78px] top-[17px] h-[58px] w-[5px] rounded-[4px] bg-[#91a88f]" />
      </>
    ),
  },
  peach: {
    bg: '#f8e5dc',
    art: (
      <>
        <i className="absolute left-[17px] top-[21px] h-[11px] w-[81px] rounded-[5px] bg-[#ae725f]" />
        <i className="absolute left-[17px] top-[42px] h-[28px] w-[112px] rounded-[6px] bg-[#edc2ae]" />
      </>
    ),
  },
  blue: {
    bg: '#e8f0f9',
    art: (
      <>
        <i className="absolute left-[19px] top-[18px] h-[7px] w-[69px] rounded-[4px] bg-[#768fb5]" />
        <i className="absolute left-[19px] top-[39px] h-[33px] w-[43px] rounded-full border-[7px] border-[#91b4ce]" />
      </>
    ),
  },
  ink: {
    bg: '#283842',
    art: (
      <>
        <i className="absolute left-[17px] top-[18px] h-[6px] w-[79px] rounded-[4px] bg-[#a7cad2]" />
        <i className="absolute bottom-[15px] left-[17px] h-[20px] w-[34px] rounded-[4px] bg-[#e2a851]" />
      </>
    ),
  },
};

/** Scatter positions inside the 1080x520 stage, matching v4's arrangement. */
const WORLD_APPS: { name: string; theme: string; style: CSSProperties }[] = [
  { name: 'Portfolio', theme: 'sunrise', style: { top: 54, left: '3%', transform: 'rotate(-4deg)' } },
  { name: 'Little tools', theme: 'mint', style: { top: 22, left: '34%', transform: 'rotate(3deg)' } },
  { name: 'Project board', theme: 'paper', style: { top: 66, right: '7%', transform: 'rotate(-2deg)' } },
  { name: 'Bookings', theme: 'peach', style: { bottom: 78, left: '14%', transform: 'rotate(5deg)' } },
  { name: 'Study tracker', theme: 'blue', style: { bottom: 26, left: '43%', transform: 'rotate(-2deg)' } },
  { name: 'Game night', theme: 'ink', style: { right: '12%', bottom: 77, transform: 'rotate(3deg)' } },
];

function WorldApp({ name, theme, className = '', style }: { name: string; theme: string; className?: string; style?: CSSProperties }) {
  const { bg, art } = WORLD_THEMES[theme];
  return (
    <div
      className={`flex w-fit flex-col gap-[7px] rounded-[var(--ds-r)] border border-[var(--ds-line)] bg-[var(--ds-card)] p-2.5 shadow-[var(--ds-sh)] ${className}`}
      style={style}
    >
      <div className="relative h-[91px] w-[146px] overflow-hidden rounded-[14px]" style={{ background: bg }} aria-hidden="true">
        {art}
      </div>
      <strong className="text-[12px] font-semibold text-[var(--ds-ink)]">{name}</strong>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-[var(--ds-mute)]">
        <i className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
        Live on Embarko
      </span>
    </div>
  );
}

/* The three-beat "how it works" line under the hero CTA, ported from v4's
   hero. Step 1 is the current one because the CTA above it is the copy. */
/* The marks of every agent the prompt is known to work with, under the hero
   CTA. Icons only and dimmed by default: fourteen full-strength logos would
   compete with the headline, and the step above already says an agent is what
   receives the prompt. Names are carried by alt text rather than visible
   labels, which would not fit on one line. */
function AgentStrip() {
  return (
    <div className="flex flex-col items-center gap-3 pt-7">
      <p className="ds-kicker !mb-0">
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
  );
}

/**
 * The Weekend trip planner — the one "real app" screen this page shows, drawn
 * in v1's lighter idiom (the /v4 showcase runs the same app off its own CSS).
 *
 * Lives on its own so the scenes that need a finished-looking screen share one
 * definition: a grey skeleton never reads as a real app, and two copies of this
 * markup would drift the moment either scene is touched.
 */
function WeekendApp() {
  return (
    <>

      <div className="relative overflow-hidden rounded-[14px]">
        <img
          src={barcelonaMorning.src}
          alt="Sagrada Família in Barcelona"
          className="h-36 w-full object-cover"
        />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-[var(--ds-card)]/85 px-2 py-1 text-[10px]  tracking-wide text-[var(--ds-ink)] backdrop-blur">
          <MapPin className="h-3 w-3" aria-hidden="true" /> Barcelona, Spain
        </span>
      </div>
      <div className="space-y-4 pt-4">
        <div className="space-y-1">
          <p className="text-[10px]  uppercase tracking-[0.2em] text-[var(--ds-dim)]">Eight sunlit days</p>
          <h3 className="text-xl font-semibold tracking-tight">Barcelona</h3>
          <p className="flex items-center gap-1.5 text-xs  text-[var(--ds-mute)]">
            <Plane className="h-3 w-3" aria-hidden="true" /> 8 – 15 June 2026
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-[var(--ds-line)] py-3">
          {[
            { value: '12', label: 'places saved' },
            { value: '4', label: 'stays & tables' },
            { value: '1', label: 'slow afternoon' },
          ].map((stat) => (
            <div key={stat.label} className="space-y-0.5">
              <div className="text-base ">{stat.value}</div>
              <div className="text-[10px]  leading-tight text-[var(--ds-dim)]">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between text-[10px]  uppercase tracking-[0.2em] text-[var(--ds-dim)]">
            <span>Monday</span>
            <span>8 June</span>
          </div>
          {[
            { time: '10:00', dot: 'bg-amber-300', title: 'Sagrada Família', note: 'Morning architecture walk' },
            { time: '13:30', dot: 'bg-rose-300', title: 'Can Culleretes', note: 'Lunch in the Gothic Quarter' },
          ].map((item) => (
            <div key={item.time} className="flex items-start gap-2.5">
              <span className="w-9 shrink-0 pt-0.5 text-[10px]  text-[var(--ds-dim)]">{item.time}</span>
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
              <p className="space-y-0.5">
                <span className="block text-xs font-normal">{item.title}</span>
                <span className="block text-[10px]  text-[var(--ds-dim)]">{item.note}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* The page's primary call to action. Defined once so the hero and the closing
   frame stay the same button — same label, same shape, same copy behaviour. */
function CopyPromptCta() {
  return <PrimaryCta onClicked={() => trackCTA('copy')} />;
}

/* The story scenes carry the same numerals as the "How?" recap further down, so
   a reader arriving at that summary recognises it as a recap of what they just
   watched rather than new material. Styled to match those numerals exactly. */
function SceneStep({ n }: { n: string }) {
  return <span className="ds-kicker">{n}</span>;
}

function Steps() {
  return <DsSteps className="!mt-0" />;
}

/**
 * Client component to track page view
 */
function PageViewTracker() {
  useEffect(() => {
    trackPageView();
  }, []);
  return null;
}

export default function EmbarkoV1() {
  return (
    /* The header sits OUTSIDE #v1-scenes on purpose: that wrapper has
       overflow-x-hidden, and an overflow ancestor becomes the containing block
       for position:sticky, which stops the header sticking at all. */
    <>
      <PageViewTracker />
      <SiteHeader />

      {/* Scene heights are 100dvh, not 100vh. On mobile 100vh is the viewport
          with the browser toolbar *collapsed*, so every scene is taller than
          what is actually visible — which leaves SectionSnap's "is this scene
          read to its edge?" check permanently true, and the snap never fires. */}
      <div id="v1-scenes" className="overflow-x-hidden bg-background text-foreground antialiased">
        {/* One scroll gesture = one scene. Renders nothing; see SectionSnap.tsx. */}
        <SectionSnap containerSelector="#v1-scenes" offsetSelector="nav" />

      {/* SCENE 01: THE OPENING */}
      <section className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center px-4 py-20 sm:px-6">
        {/* Light gathers at the top and clears to white behind the type, so the
            headline never competes with the sky. */}
        <GlowBackdrop position="top" />
        <div className="relative z-10 max-w-4xl space-y-8 text-center">
          {/* 80px, not text-8xl: at 96px this headline wraps to three lines in the
              896px column. 84px is the largest that still fits two, so 80 leaves a
              little room for font-metric differences. */}
          <h1 className={`${H_DISPLAY} text-[44px] sm:text-6xl md:text-[80px]`}>
            <Serif grad>Instant</Serif> hosting for every app you build with AI
          </h1>
          <p className="text-lg text-[var(--ds-mute)] md:text-xl">
            Your AI builds it. Embarko runs it.
          </p>
          <div className="flex flex-col items-center justify-center gap-5 pt-8">
            <CopyPromptCta />
            <Steps />
            <AgentStrip />
          </div>
        </div>
      </section>

      {/* SCENE 02: SOMETHING IS BEING BUILT */}
      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-20 sm:px-6">
        <div className="grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <div className="min-w-0 space-y-6">
            <SceneStep n="01" />
            <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>Build with your <Serif>AI</Serif></h2>
            <div className="space-y-4">
              <div className="text-[var(--ds-mute)]">You:</div>
              <div className="text-2xl tracking-tight">Build me a weekend trip planner.</div>
            </div>
            <div className="space-y-4 border-t border-[var(--ds-line)] pt-8">
              <div className="text-[var(--ds-mute)]">AI:</div>
              <div className="text-2xl tracking-tight">Creating Weekend now...</div>
              <span className={`inline-block ${URL_CHIP}`}>weekend — local</span>
            </div>
            <CopyPromptCta />
          </div>
          {/* A real screen reads as a finished app in a way a skeleton never did. */}
          <AppWindow label="weekend — local" labelClassName={URL_CHIP}>
            <WeekendApp />
            <p className="pt-4 font-mono text-xs uppercase tracking-[0.06em] text-[var(--ds-dim)]">Built</p>
          </AppWindow>
        </div>
      </section>

      {/* SCENE 03: THE QUESTION */}
      <section className="flex min-h-[100dvh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl space-y-12">
          <div className="space-y-4 text-center">
            <SceneStep n="02" />
            <div className="text-xl text-[var(--ds-mute)]">You:</div>
            <h2 className={`${H_DISPLAY} text-5xl sm:text-6xl md:text-7xl`}>Now <Serif grad>what?</Serif></h2>
          </div>
          <div className="space-y-4 border-t border-[var(--ds-line)] pt-12 text-center">
            <div className="text-xl text-[var(--ds-mute)]">Embarko:</div>
            <p className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">Give it the prompt.</p>
            <div className="pt-6"><CopyPromptCta /></div>
          </div>
        </div>
      </section>

      {/* SCENE 04: THE MAGIC — the one moment that earns a big lift */}
      <section className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-20 sm:px-6">
        {/* Kept light rather than heavy: this source reads grey at full strength,
            and the scene wants a glow around the window, not fog behind it. */}
        <GlowBackdrop position="full" />
        <div className="relative z-10 w-full max-w-3xl space-y-12 text-center">
          {/* Same screen as scene 02 — the app they watched get built is the app
              that goes live, so it has to be recognisably the same one. */}
          <AppWindow label="weekend.embarko.app" labelClassName={URL_CHIP} className="mx-auto max-w-md -translate-y-2 text-left">
            <WeekendApp />
          </AppWindow>
          <div className="space-y-6">
            <SceneStep n="03" />
            <h3 className={`${H_DISPLAY} text-5xl sm:text-6xl md:text-7xl`}>It&apos;s <Serif grad>live.</Serif></h3>
            <div className="flex flex-col items-center gap-3 text-lg text-[var(--ds-mute)]">
              <p>
                <span className="ds-pill font-mono">weekend.embarko.app</span>
              </p>
              <p className="inline-flex items-center gap-2 font-semibold text-[var(--ds-ink)]"><i className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" aria-hidden="true" />Live</p>
            </div>
            <CopyPromptCta />
          </div>
        </div>
      </section>

      {/* SCENE 05: HOW? */}
      <section className="flex min-h-[100dvh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl space-y-16">
          <h2 className={`${H_DISPLAY} text-center text-5xl sm:text-6xl`}><Serif grad>How?</Serif></h2>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="space-y-3">
              <SceneStep n="01" />
              <h3 className="!text-xl">Build with your AI.</h3>
            </Card>
            <Card className="space-y-3">
              <SceneStep n="02" />
              <h3 className="!text-xl">Give it the prompt.</h3>
              {/* Counts the same as the hero CTA: same conversion. */}
              <PrimaryCta size="sm" glow={false} onClicked={() => trackCTA('copy')} />
            </Card>
            <Card className="space-y-3">
              <SceneStep n="03" />
              <h3 className="!text-xl">Tell it to deploy.</h3>
              <p className="ds-serif !text-lg">Deploy this to Embarko.</p>
            </Card>
          </div>
          {/* The three steps say what you do; this says what you get, so the
              recap resolves instead of stopping on a single word. */}
          <div className="border-t border-[var(--ds-line)] pt-12 text-center">
            <h3 className={`${H_DISPLAY} text-5xl sm:text-6xl`}><Serif grad>Live.</Serif></h3>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--ds-mute)] md:text-xl">
              A real URL, a database, and HTTPS. You set up none of it.
            </p>
          </div>
        </div>
      </section>

      {/* SCENE 06: THE PAIN REMOVED */}
      <section className="flex min-h-[100dvh] flex-col items-center justify-center gap-12 px-4 py-20 sm:px-6">
        <FeatureShowcase tone="token" />
        <CopyPromptCta />
      </section>

      {/* SCENE 07: WHAT CAN I BUILD */}
      <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-5xl space-y-16">
          <h2 className={`${H_DISPLAY} text-center text-4xl sm:text-5xl md:text-6xl`}>What are you <Serif grad>building?</Serif></h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {APPS.map((app) => (
              <div
                key={app.title}
                className="min-w-0 rounded-[var(--ds-r)] border border-[var(--ds-line)] bg-[var(--ds-card)] p-2.5 shadow-[var(--ds-sh)]"
              >
                {/* Fixed height so every panel in the grid lines up and the
                    captions below sit on a shared baseline. */}
                <SketchPanel variant={app.variant} className="h-36 !rounded-[16px] p-5" />
                <div className="space-y-1 px-1.5 pb-1 pt-3.5">
                  <h3 className="text-base font-semibold tracking-tight">{app.title}</h3>
                  <p className="text-sm text-[var(--ds-mute)]">{app.desc}</p>
                  <p className="flex items-center gap-1.5 pt-1 text-xs  text-[var(--ds-mute)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live on Embarko
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--ds-line)] pt-12 text-center">
            <h3 className={`${H_DISPLAY} text-3xl sm:text-4xl md:text-5xl`}>If you can build it,</h3>
            <p className="mt-2 text-2xl tracking-tight text-[var(--ds-mute)] sm:text-3xl md:text-4xl">you can put it <Serif>online.</Serif></p>
            <div className="mt-10"><CopyPromptCta /></div>
          </div>
        </div>
      </section>

      {/* SCENE 08: THE WORLD OF APPS (ported from /v4) */}
      <section
        className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-20 sm:px-6"
      >
        <GlowBackdrop />
        <div className="relative z-10 w-full max-w-6xl">
          <div className="mx-auto w-full max-w-[580px] text-center">
            <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-6xl`}>Everything you build can have a <Serif grad>home</Serif> online.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ds-mute)]">
              Your agents keep creating. Embarko keeps it all live.
            </p>
            <div className="mt-6"><CopyPromptCta /></div>
          </div>

          {/* The scatter needs room to spread, so below md the cards stack into a
              plain grid rather than overlapping each other. */}
          <div className="relative mx-auto mt-8 hidden h-[520px] w-full max-w-[1080px] md:block" aria-label="A calm world of applications hosted on Embarko">
            {WORLD_APPS.map((app) => (
              <WorldApp key={app.name} name={app.name} theme={app.theme} className="absolute" style={app.style} />
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 justify-items-center gap-4 md:hidden">
            {WORLD_APPS.slice(0, 4).map((app) => (
              <WorldApp key={app.name} name={app.name} theme={app.theme} />
            ))}
          </div>
        </div>
      </section>

      {/* SCENE 10: BUILD YOUR WAY */}
      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full max-w-4xl space-y-12 text-center">
          <h2 className={`${H_DISPLAY} text-5xl sm:text-6xl`}>Build your <Serif grad>way.</Serif></h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { slug: 'claudecode', name: 'Claude' },
              { slug: 'codex', name: 'Codex' },
              { slug: 'cursor', name: 'Cursor' },
              { slug: 'lovable', name: 'Lovable' },
              { slug: 'gemini', name: 'Gemini' },
            ].map((ai) => (
              <div
                key={ai.slug}
                className="flex items-center gap-2.5 rounded-full border border-[var(--ds-line)] bg-[var(--ds-card)] px-5 py-3 font-medium shadow-[var(--ds-sh)] "
              >
                {/* Monochrome marks from public/agenticons, as used on v2. */}
                <img
                  src={`/agenticons/agenticon-${ai.slug}.svg`}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 object-contain"
                />
                {ai.name}
              </div>
            ))}
            <div className="rounded-full border border-[var(--ds-line)] bg-[var(--ds-card)] px-5 py-3 font-medium shadow-[var(--ds-sh)] text-[var(--ds-mute)]">
              + more
            </div>
          </div>
          <p className="text-lg text-[var(--ds-mute)]">Embarko works with the AI you already use.</p>
          <CopyPromptCta />
        </div>
      </section>

      {/* SCENE 12: THE CORE IDEA */}
      <section className="flex min-h-[100dvh] items-center justify-center px-6 py-20">
        <div className="max-w-4xl space-y-8 text-center">
          <h2 className={`${H_DISPLAY} text-5xl sm:text-6xl md:text-8xl`}>
            Don&apos;t learn hosting.
            <br />
            Build <Serif grad>something.</Serif>
          </h2>
          <p className="text-lg text-[var(--ds-mute)] md:text-xl">
            Your time is better spent making the thing.
          </p>
          <div className="pt-4"><CopyPromptCta /></div>
        </div>
      </section>

      {/* SCENE 13: FINAL FRAME */}
      {/* Why Embarko + European hosting, as two scenes. min-h-[100dvh] and the
          centring here are what make them beats in the snap sequence rather
          than short bands the scroll flies past. */}
      <WhyEmbarko tone="token" className="flex min-h-[100dvh] flex-col justify-center px-6 py-20" cta={<CopyPromptCta />} />
      <InfrastructureTrust tone="token" className="flex min-h-[100dvh] flex-col justify-center px-6 py-20" cta={<CopyPromptCta />} />

      {/* The footer lives inside this last scene rather than after it: the
          closing beat snaps into view already carrying the bottom of the site,
          so nobody has to scroll past a finished page to reach the links. */}
      <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 pt-20 sm:px-6">
        {/* Mirror of the opening: there the light sat above, here it rises from below. */}
        <GlowBackdrop />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <div className="max-w-4xl space-y-12 text-center">
          <h2 className={`${H_DISPLAY} text-4xl sm:text-5xl md:text-7xl`}>Your AI already built it.</h2>
          <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--ds-mute)] sm:text-4xl md:text-6xl">Let it <Serif grad>ship</Serif> it.</h3>
          <div className="space-y-6 border-t border-[var(--ds-line)] pt-12">
            <p className="text-lg text-[var(--ds-mute)]">Teach your AI to ship with Embarko.</p>
            <div className="flex flex-col items-center gap-5">
              <CopyPromptCta />
              <Steps />
            </div>
          </div>
        </div>
        </div>
        {/* -mx-6 undoes the section's own gutter so the footer keeps its own. */}
        <div className="relative z-10 -mx-4 sm:-mx-6">
          <SiteFooter />
        </div>
      </section>
      </div>
    </>
  );
}
