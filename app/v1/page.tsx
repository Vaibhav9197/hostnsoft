import type { CSSProperties, ReactNode } from 'react';
import { MapPin, Plane } from 'lucide-react';
import barcelonaMorning from '../v4/barcelona-morning.png';
import { SectionSnap } from './SectionSnap';
import { SiteHeader } from '../components/SiteHeader';
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

/** A miniature application window. The product is the visual, so these are drawn, not photographed. */
function AppWindow({
  label,
  children,
  className = '',
  style,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
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
          <span className="ml-2 truncate text-[10px] font-light tracking-wide text-gray-400">{label}</span>
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

const SKY_APPS = [
  { label: 'portfolio', variant: 'portfolio', top: '4%', left: '2%', w: 'w-52', delay: '0s' },
  { label: 'assistant', variant: 'ai', top: '30%', left: '20%', w: 'w-48', delay: '1.1s' },
  { label: 'arcade', variant: 'game', top: '8%', left: '43%', w: 'w-44', delay: '2.2s' },
  { label: 'insights', variant: 'expense', top: '46%', left: '58%', w: 'w-52', delay: '0.6s' },
  { label: 'notes', variant: 'site', top: '18%', left: '76%', w: 'w-44', delay: '1.7s' },
  { label: 'streaks', variant: 'habit', top: '62%', left: '10%', w: 'w-40', delay: '2.8s' },
];

/* Keyboard-shortcut chip for the copy button. `leading-none` matters: without
   it the span inherits the button's 28px line-height and renders as a tall box
   around a small glyph. Sized against the button's 18px label. */
/* The three-beat "how it works" line under the hero CTA, ported from v4's
   hero. Step 1 is the current one because the CTA above it is the copy. */
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
          {COPIED_LABEL}
          <KeyChip />
        </>
      }
    >
      Copy the Embarko prompt
      <KeyChip />
    </CopyPromptButton>
  );
}

function Steps() {
  const steps = ['Copy', 'Paste into your AI agent', 'Ask it to deploy'];
  return (
    <ol
      aria-label="How it works"
      className="flex flex-wrap items-center justify-center gap-x-[18px] gap-y-2 text-sm font-medium text-gray-400"
    >
      {steps.map((label, i) => (
        <li
          key={label}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap ${
            i === 0 ? 'text-black' : ''
          }`}
        >
          <span
            /* leading-none is load-bearing: without it the numeral inherits the
               list's 20px line-height inside an 18px circle, so the line box
               overflows and place-items-center centres the wrong box. */
            className={`grid h-[18px] w-[18px] place-items-center rounded-full border text-[10px] font-bold leading-none ${
              i === 0 ? 'border-black bg-gray-100 text-black' : 'border-gray-300 text-gray-400'
            }`}
          >
            {i + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function KeyChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-2 py-1.5 font-mono text-xs leading-none tracking-wide text-white/75">
      <span className="text-[13px] leading-none">⌘</span>
      C
    </span>
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
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-8xl">
            Your AI builds it.
            <br />
            Embarko runs it.
          </h1>
          <p className="text-xl font-light text-gray-600 md:text-2xl">
            The easiest way to put your AI-built app online.
          </p>
          <div className="flex flex-col items-center justify-center gap-5 pt-8">
            <CopyPromptCta />
            <Steps />
          </div>
        </div>
      </section>

      {/* SCENE 02: SOMETHING IS BEING BUILT */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-gray-600">You:</div>
              <div className="text-2xl font-light">Build me a weekend trip planner.</div>
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-8">
              <div className="text-gray-600">AI:</div>
              <div className="text-2xl font-light">Creating Weekend now...</div>
            </div>
          </div>
          {/* A real screen reads as a finished app in a way a skeleton never did. */}
          <AppWindow label="weekend — local">
            <WeekendApp />
            <p className="pt-4 text-xs font-light uppercase tracking-[0.2em] text-gray-400">Built</p>
          </AppWindow>
        </div>
      </section>

      {/* SCENE 03: THE QUESTION */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl space-y-12">
          <div className="space-y-4 text-center">
            <div className="text-xl text-gray-600">You:</div>
            <h2 className="text-4xl font-bold sm:text-5xl md:text-7xl">Now what?</h2>
          </div>
          <div className="space-y-4 border-t border-gray-200 pt-12 text-center">
            <div className="text-xl text-gray-600">Embarko:</div>
            <p className="text-4xl font-light md:text-5xl">Deploy it to Embarko.</p>
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
          <AppWindow label="weekend.embarko.app" className="mx-auto max-w-md -translate-y-2 text-left">
            <WeekendApp />
          </AppWindow>
          <div className="space-y-6">
            <h3 className="text-4xl font-bold sm:text-5xl md:text-7xl">It&apos;s live.</h3>
            <div className="space-y-2 text-2xl font-light text-gray-600">
              <p>weekend.embarko.app</p>
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
              <h3 className="text-2xl font-light">Teach it Embarko.</h3>
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
          <div className="border-t border-gray-200 pt-12 text-center">
            <h3 className="text-4xl font-bold sm:text-5xl md:text-6xl">Live.</h3>
          </div>
        </div>
      </section>

      {/* SCENE 06: THE PAIN REMOVED */}
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-20">
        <div className="w-full max-w-4xl space-y-12">
          <h2 className="text-center text-3xl font-light sm:text-4xl md:text-5xl">Your app is ready.</h2>
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-3">
            {['Hosting', 'Domains', 'Login', 'Data', 'Files', 'Security', 'Deployments', 'Backups', 'CDN'].map(
              (item) => (
                <div key={item} className="rounded border border-gray-200 bg-white p-4 font-light text-gray-600">
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="space-y-8 border-t border-gray-300 pt-12 text-center">
            <h3 className="text-4xl font-bold sm:text-5xl md:text-7xl">Embarko</h3>
            <p className="text-2xl font-light md:text-3xl">Your app is live.</p>
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

      {/* SCENE 08: THE SKY */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
        <SkyBackdrop
          src="/atmosphere/sky-open.jpg"
          position="center 35%"
          blur={22}
          opacity={0.7}
          fade="from-white via-transparent to-white"
        />
        <div className="relative z-10 w-full max-w-6xl space-y-12">
          <h2 className="text-center text-4xl font-bold sm:text-5xl md:text-6xl">A world of things you&apos;ve built.</h2>
          <div className="relative hidden h-[26rem] md:block">
            {SKY_APPS.map((app) => (
              <AppWindow
                key={app.label}
                label={app.label}
                className={`absolute ${app.w} animate-[float_9s_ease-in-out_infinite] backdrop-blur-sm`}
                style={{ top: app.top, left: app.left, animationDelay: app.delay }}
              >
                <SketchPanel variant={app.variant} className="p-3" />
              </AppWindow>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {SKY_APPS.slice(0, 4).map((app) => (
              <AppWindow key={app.label} label={app.label}>
                <SketchPanel variant={app.variant} className="p-3" />
              </AppWindow>
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
      </div>
    </>
  );
}
