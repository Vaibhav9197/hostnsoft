import type { CSSProperties, ReactNode } from 'react';
import {
  Activity, ArrowRight, Check, Copy, Database, FolderOpen, Globe, HardDrive,
  KeyRound, MapPin, Plane, RefreshCw, ShieldCheck,
} from 'lucide-react';
import barcelonaMorning from '../v4/barcelona-morning.png';
import { SectionSnap } from './SectionSnap';
import { AGENTS, agentIconSrc } from '../lib/agents';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { CopyPromptButton, COPIED_LABEL } from '../components/CopyPromptButton';

/**
 * Atmospheric backdrop.
 *
 * The brief asks for a sky that is "not a literal stock photo", so the source
 * photography is never shown straight: it is blurred, desaturated, scaled past
 * the frame (so the blur has no soft vignette at the edges) and dropped to a low
 * opacity under a wash of the page background. What survives is light and depth,
 * not a photograph.
 */
function SkyBackdrop({
  src,
  position = 'center',
  blur = 24,
  opacity = 0.5,
  saturate = 0.75,
  fade = 'from-white via-white/40 to-white',
}: {
  src: string;
  position?: string;
  blur?: number;
  opacity?: number;
  /** Per-source correction: the four photos differ in cast, and the scenes have to feel like one sky. */
  saturate?: number;
  fade?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{
          objectPosition: position,
          filter: `blur(${blur}px) saturate(${saturate})`,
          opacity,
        }}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${fade}`} />
    </div>
  );
}

/* The highlight on an app's address, wherever it appears — the local build and
   the deployed URL both wear it, so one definition keeps the yellow identical
   across all four places it shows up. */
const URL_CHIP =
  'rounded bg-yellow-300 px-1.5 py-0.5 text-[10px] font-light tracking-wide text-gray-800';

/** A miniature application window. The product is the visual, so these are drawn, not photographed. */
function AppWindow({
  label,
  children,
  className = '',
  /* The colour lives in a prop rather than the base classes so a caller can
     replace it outright — two competing text- utilities in one string are
     resolved by CSS source order, not by the order they are written. */
  labelClassName = 'text-gray-400',
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
      className={`overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${className}`}
      style={style}
    >
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-gray-50/80 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-black/10" />
        <span className="h-2 w-2 rounded-full bg-black/10" />
        <span className="h-2 w-2 rounded-full bg-black/10" />
        {label ? (
          <span className={`ml-2 truncate rounded text-[10px] font-light tracking-wide ${labelClassName}`}>
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
      className={`flex w-fit flex-col gap-[7px] rounded-[13px] border border-black/[0.06] bg-white/85 p-2.5 shadow-[0_20px_38px_rgba(0,0,0,0.09)] backdrop-blur-[7px] ${className}`}
      style={style}
    >
      <div className="relative h-[91px] w-[146px] overflow-hidden rounded-[8px]" style={{ background: bg }} aria-hidden="true">
        {art}
      </div>
      <strong className="text-[12px] font-semibold text-neutral-800">{name}</strong>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-neutral-600">
        <i className="h-1.5 w-1.5 rounded-full bg-[#222] shadow-[0_0_0_3px_rgba(0,0,0,0.08)]" />
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">
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

      <div className="relative overflow-hidden rounded-md">
        <img
          src={barcelonaMorning.src}
          alt="Sagrada Família in Barcelona"
          className="h-36 w-full object-cover"
        />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[10px] font-light tracking-wide text-gray-700 backdrop-blur">
          <MapPin className="h-3 w-3" aria-hidden="true" /> Barcelona, Spain
        </span>
      </div>
      <div className="space-y-4 pt-4">
        <div className="space-y-1">
          <p className="text-[10px] font-light uppercase tracking-[0.2em] text-gray-400">Eight sunlit days</p>
          <h3 className="text-xl font-light">Barcelona</h3>
          <p className="flex items-center gap-1.5 text-xs font-light text-gray-500">
            <Plane className="h-3 w-3" aria-hidden="true" /> 8 – 15 June 2026
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3">
          {[
            { value: '12', label: 'places saved' },
            { value: '4', label: 'stays & tables' },
            { value: '1', label: 'slow afternoon' },
          ].map((stat) => (
            <div key={stat.label} className="space-y-0.5">
              <div className="text-base font-light">{stat.value}</div>
              <div className="text-[10px] font-light leading-tight text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between text-[10px] font-light uppercase tracking-[0.2em] text-gray-400">
            <span>Monday</span>
            <span>8 June</span>
          </div>
          {[
            { time: '10:00', dot: 'bg-amber-300', title: 'Sagrada Família', note: 'Morning architecture walk' },
            { time: '13:30', dot: 'bg-rose-300', title: 'Can Culleretes', note: 'Lunch in the Gothic Quarter' },
          ].map((item) => (
            <div key={item.time} className="flex items-start gap-2.5">
              <span className="w-9 shrink-0 pt-0.5 text-[10px] font-light text-gray-400">{item.time}</span>
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
              <p className="space-y-0.5">
                <span className="block text-xs font-normal">{item.title}</span>
                <span className="block text-[10px] font-light text-gray-400">{item.note}</span>
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
  return (
    <CopyPromptButton
      className="inline-flex items-center justify-center gap-2.5 rounded-[15px] bg-black px-8 py-4 text-lg font-medium text-white transition hover:bg-gray-900"
      copiedChildren={
        <>
          <Check className="h-[18px] w-[18px]" aria-hidden="true" />
          {COPIED_LABEL}
        </>
      }
    >
      <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
      Copy the deploy prompt
    </CopyPromptButton>
  );
}

/* The story scenes carry the same numerals as the "How?" recap further down, so
   a reader arriving at that summary recognises it as a recap of what they just
   watched rather than new material. Styled to match those numerals exactly. */
/* What Embarko handles for a deployed app — ported from /v3's "Already
   handled" grid. v3 draws it from the shared design tokens; v1 uses its own
   neutral greys, so the block sits in this page's palette rather than arriving
   in v3's warmer one. */
const INCLUDED = [
  { Icon: Globe, title: 'Domain', body: 'Get a live URL the moment your app deploys.' },
  { Icon: Database, title: 'Database', body: 'Your app can save and load data right away.' },
  { Icon: KeyRound, title: 'Login', body: 'Let people sign in without building auth yourself.' },
  { Icon: FolderOpen, title: 'Files', body: 'Upload and store files without extra setup.' },
  { Icon: ShieldCheck, title: 'HTTPS', body: 'Every app is secure by default.' },
  { Icon: HardDrive, title: 'Backups', body: 'Your data is backed up automatically.' },
  { Icon: RefreshCw, title: 'Updates', body: 'Ship changes any time your agent rebuilds.' },
  { Icon: Activity, title: 'Uptime', body: 'Your app stays online without you watching it.' },
];

function SceneStep({ n }: { n: string }) {
  return <div className="text-6xl font-bold text-gray-300">{n}</div>;
}

function Steps() {
  const steps = ['Copy', 'Paste into your AI agent', 'Ask it to deploy'];
  return (
    <ol
      aria-label="How it works"
      className="flex flex-wrap items-center justify-center gap-x-[18px] gap-y-2 text-sm font-medium text-black"
    >
      {steps.map((label, i) => (
        <li key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            /* leading-none is load-bearing: without it the numeral inherits the
               list's 20px line-height inside an 18px circle, so the line box
               overflows and place-items-center centres the wrong box. */
            className="grid h-[18px] w-[18px] place-items-center rounded-full border border-black text-[10px] font-bold leading-none text-black"
          >
            {i + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export default function EmbarkoV1() {
  return (
    /* The header sits OUTSIDE #v1-scenes on purpose: that wrapper has
       overflow-x-hidden, and an overflow ancestor becomes the containing block
       for position:sticky, which stops the header sticking at all. */
    <>
      <SiteHeader />

      <div id="v1-scenes" className="overflow-x-hidden bg-white text-black">
        {/* One scroll gesture = one scene. Renders nothing; see SectionSnap.tsx. */}
        <SectionSnap containerSelector="#v1-scenes" offsetSelector="nav" />

      {/* SCENE 01: THE OPENING */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
        {/* Light gathers at the top and clears to white behind the type, so the
            headline never competes with the sky. */}
        <SkyBackdrop
          src="/atmosphere/sky-dawn.jpg"
          position="center 20%"
          blur={30}
          opacity={0.8}
          fade="from-white/10 via-white/60 to-white"
        />
        <div className="relative z-10 max-w-4xl space-y-8 text-center">
          {/* 80px, not text-8xl: at 96px this headline wraps to three lines in the
              896px column. 84px is the largest that still fits two, so 80 leaves a
              little room for font-metric differences. */}
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-[80px]">
            The easiest way to put your AI-built app online
          </h1>
          <p className="text-xl font-light text-gray-600 md:text-2xl">
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
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <SceneStep n="01" />
            <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">Build with your AI</h2>
            <div className="space-y-4">
              <div className="text-gray-600">You:</div>
              <div className="text-2xl font-light">Build me a weekend trip planner.</div>
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-8">
              <div className="text-gray-600">AI:</div>
              <div className="text-2xl font-light">Creating Weekend now...</div>
              <span className={`inline-block ${URL_CHIP}`}>weekend — local</span>
            </div>
          </div>
          {/* A real screen reads as a finished app in a way a skeleton never did. */}
          <AppWindow label="weekend — local" labelClassName={URL_CHIP}>
            <WeekendApp />
            <p className="pt-4 text-xs font-light uppercase tracking-[0.2em] text-gray-400">Built</p>
          </AppWindow>
        </div>
      </section>

      {/* SCENE 03: THE QUESTION */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl space-y-12">
          <div className="space-y-4 text-center">
            <SceneStep n="02" />
            <div className="text-xl text-gray-600">You:</div>
            <h2 className="text-4xl font-bold sm:text-5xl md:text-7xl">Now what?</h2>
          </div>
          <div className="space-y-4 border-t border-gray-200 pt-12 text-center">
            <div className="text-xl text-gray-600">Embarko:</div>
            <p className="text-4xl font-light md:text-5xl">Give it the prompt.</p>
          </div>
        </div>
      </section>

      {/* SCENE 04: THE MAGIC — the one moment that earns a big lift */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        {/* Kept light rather than heavy: this source reads grey at full strength,
            and the scene wants a glow around the window, not fog behind it. */}
        <SkyBackdrop
          src="/atmosphere/sky-haze.jpg"
          position="center 60%"
          blur={40}
          opacity={0.42}
          fade="from-white via-white/35 to-white"
        />
        <div className="relative z-10 w-full max-w-3xl space-y-12 text-center">
          {/* Same screen as scene 02 — the app they watched get built is the app
              that goes live, so it has to be recognisably the same one. */}
          <AppWindow label="weekend.embarko.app" labelClassName={URL_CHIP} className="mx-auto max-w-md -translate-y-2 text-left">
            <WeekendApp />
          </AppWindow>
          <div className="space-y-6">
            <SceneStep n="03" />
            <h3 className="text-4xl font-bold sm:text-5xl md:text-7xl">It&apos;s live.</h3>
            <div className="space-y-2 text-2xl font-light text-gray-600">
              <p>
                <span className="rounded bg-yellow-300 px-2 py-0.5 text-gray-800">weekend.embarko.app</span>
              </p>
              <p className="font-medium text-green-600">● Live</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCENE 05: HOW? */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl space-y-16">
          <h2 className="text-center text-4xl font-bold sm:text-5xl md:text-6xl">How?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-4">
              <div className="text-6xl font-bold text-gray-300">01</div>
              <h3 className="text-2xl font-light">Build with your AI.</h3>
            </div>
            <div className="space-y-4">
              <div className="text-6xl font-bold text-gray-300">02</div>
              <h3 className="text-2xl font-light">Give it the prompt.</h3>
              <CopyPromptButton
                className="font-medium text-black underline hover:no-underline"
                copiedChildren={COPIED_LABEL}
              >
                Copy prompt →
              </CopyPromptButton>
            </div>
            <div className="space-y-4">
              <div className="text-6xl font-bold text-gray-300">03</div>
              <h3 className="text-2xl font-light">Tell it to deploy.</h3>
              <p className="italic text-gray-600">Deploy this to Embarko.</p>
            </div>
          </div>
          {/* The three steps say what you do; this says what you get, so the
              recap resolves instead of stopping on a single word. */}
          <div className="border-t border-gray-200 pt-12 text-center">
            <h3 className="text-4xl font-bold sm:text-5xl md:text-6xl">Live.</h3>
            <p className="mx-auto mt-5 max-w-xl text-xl font-light text-gray-600 md:text-2xl">
              A real URL, a database, and HTTPS. You set up none of it.
            </p>
          </div>
        </div>
      </section>

      {/* SCENE 06: THE PAIN REMOVED (ported from /v3) */}
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-20">
        <div className="w-full max-w-5xl">
          <div className="mb-12 max-w-xl">
            <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">Everything your app needs. Already handled.</h2>
            <p className="mt-4 text-lg font-light leading-relaxed text-gray-600">
              Your AI builds the app. Embarko takes care of everything needed to keep it running — you
              don&apos;t have to set any of this up yourself.
            </p>
          </div>
          {/* A 1px grid gap over a grey ground draws the cell rules, so the block
              reads as one table rather than eight detached boxes. */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            {INCLUDED.map(({ Icon, title, body }) => (
              <div key={title} className="bg-white px-6 py-7">
                <Icon aria-hidden="true" strokeWidth={1.5} className="mb-3.5 h-[22px] w-[22px]" />
                <h3 className="mb-1.5 text-base font-bold">{title}</h3>
                <p className="text-sm font-light leading-relaxed text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCENE 07: WHAT CAN I BUILD */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-5xl space-y-16">
          <h2 className="text-center text-4xl font-bold sm:text-5xl md:text-6xl">What are you building?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {APPS.map((app) => (
              <div
                key={app.title}
                className="group rounded-[16px] border border-black/[0.06] bg-white p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(0,0,0,0.10)]"
              >
                {/* Fixed height so every panel in the grid lines up and the
                    captions below sit on a shared baseline. */}
                <SketchPanel variant={app.variant} className="h-36 p-5" />
                <div className="space-y-1 px-1.5 pb-1 pt-3.5">
                  <h3 className="text-base font-bold">{app.title}</h3>
                  <p className="text-sm font-light text-gray-600">{app.desc}</p>
                  <p className="flex items-center gap-1.5 pt-1 text-xs font-light text-gray-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-black" />
                    Live on Embarko
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-12 text-center">
            <h3 className="text-3xl font-bold sm:text-4xl md:text-5xl">If you can build it,</h3>
            <p className="mt-2 text-2xl font-light sm:text-3xl md:text-4xl">you can put it online.</p>
          </div>
        </div>
      </section>

      {/* SCENE 08: THE WORLD OF APPS (ported from /v4) */}
      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20"
        style={{ background: 'radial-gradient(circle at 50% 77%, #ededed 0, rgba(255,255,255,0) 56%), #fff' }}
      >
        <div className="relative z-10 w-full max-w-6xl">
          <div className="mx-auto w-full max-w-[580px] text-center">
            <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">Everything you build can have a home online.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-neutral-500">
              Your agents keep creating. Embarko keeps it all live.
            </p>
            <a
              href="#ready"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900"
            >
              Bring your next app online
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-[3px]" />
            </a>
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
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-20">
        <div className="w-full max-w-4xl space-y-12 text-center">
          <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">Build your way.</h2>
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
                className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-6 py-3 font-light"
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
            <div className="rounded-full border border-gray-200 bg-white px-6 py-3 font-light text-gray-600">
              + more
            </div>
          </div>
          <p className="text-xl font-light text-gray-600">Embarko works with the AI you already use.</p>
        </div>
      </section>

      {/* SCENE 12: THE CORE IDEA */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="max-w-4xl space-y-8 text-center">
          <h2 className="text-5xl font-bold leading-tight sm:text-6xl md:text-8xl">
            Don&apos;t learn hosting.
            <br />
            Build something.
          </h2>
          <p className="text-xl font-light text-gray-600 md:text-2xl">
            Your time is better spent making the thing.
          </p>
        </div>
      </section>

      {/* SCENE 13: FINAL FRAME */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        {/* Mirror of the opening: there the light sat above, here it rises from below. */}
        <SkyBackdrop
          src="/atmosphere/sky-dawn.jpg"
          position="center 80%"
          blur={34}
          opacity={0.7}
          fade="from-white via-white/60 to-white/10"
        />
        <div className="relative z-10 max-w-4xl space-y-12 text-center">
          <h2 className="text-4xl font-bold sm:text-5xl md:text-7xl">Your AI already built it.</h2>
          <h3 className="text-3xl font-light text-gray-600 sm:text-4xl md:text-6xl">Let it ship it.</h3>
          <div className="space-y-6 border-t border-gray-200 pt-12">
            <p className="text-xl font-light text-gray-600">Teach your AI to ship with Embarko.</p>
            <div className="flex flex-col items-center gap-5">
              <CopyPromptCta />
              <Steps />
            </div>
          </div>
        </div>
      </section>
        <SiteFooter />
      </div>
    </>
  );
}
