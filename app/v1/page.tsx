import type { CSSProperties, ReactNode } from 'react';

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
const bar = 'rounded bg-black/[0.07]';

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
              className="aspect-square rounded-[3px]"
              style={{ background: i % 3 === 0 ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.05)' }}
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
              className="aspect-square rounded-[3px]"
              style={{ background: [0, 4, 8, 2].includes(i) ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.04)' }}
            />
          ))}
        </div>
      );
    default:
      return <div className={`${bar} h-16 w-full`} />;
  }
}

const APPS = [
  { title: 'Portfolio', desc: 'Show your work.', variant: 'portfolio' },
  { title: 'Personal website', desc: 'Your own corner of the internet.', variant: 'site' },
  { title: 'Interactive CV', desc: 'More than a PDF.', variant: 'cv' },
  { title: 'AI tool', desc: 'Turn an idea into something people can use.', variant: 'ai' },
  { title: 'Expense tracker', desc: 'Your money. Your app.', variant: 'expense' },
  { title: 'Habit planner', desc: 'Build the tool you wish existed.', variant: 'habit' },
  { title: 'Quiz / flashcards', desc: 'Learn your way.', variant: 'quiz' },
  { title: 'Calculator', desc: 'Simple idea. Real app.', variant: 'calc' },
  { title: 'Game', desc: 'Make something fun.', variant: 'game' },
];

const SKY_APPS = [
  { label: 'portfolio', variant: 'portfolio', top: '4%', left: '2%', w: 'w-52', delay: '0s' },
  { label: 'assistant', variant: 'ai', top: '30%', left: '20%', w: 'w-48', delay: '1.1s' },
  { label: 'arcade', variant: 'game', top: '8%', left: '43%', w: 'w-44', delay: '2.2s' },
  { label: 'insights', variant: 'expense', top: '46%', left: '58%', w: 'w-52', delay: '0.6s' },
  { label: 'notes', variant: 'site', top: '18%', left: '76%', w: 'w-44', delay: '1.7s' },
  { label: 'streaks', variant: 'habit', top: '62%', left: '10%', w: 'w-40', delay: '2.8s' },
];

export default function EmbarkoV1() {
  return (
    <div className="overflow-x-hidden bg-white text-black">
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
          <div className="flex flex-col justify-center gap-4 pt-8 sm:flex-row">
            <button className="bg-black px-8 py-4 text-lg font-medium text-white transition hover:bg-gray-900">
              Teach your AI to ship →
            </button>
            <button className="border border-black px-8 py-4 text-lg font-medium text-black transition hover:bg-black hover:text-white">
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* SCENE 02: SOMETHING IS BEING BUILT */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-gray-600">You:</div>
              <div className="text-2xl font-light">Build me a personal portfolio.</div>
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-8">
              <div className="text-gray-600">AI:</div>
              <div className="text-2xl font-light">Creating your portfolio now...</div>
            </div>
          </div>
          <AppWindow label="portfolio — local">
            <div className="space-y-3">
              <div className={`${bar} h-20 w-full`} />
              <div className={`${bar} h-2 w-1/2`} />
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className={`${bar} h-12`} />
                <div className={`${bar} h-12`} />
                <div className={`${bar} h-12`} />
              </div>
            </div>
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
          <AppWindow label="portfolio.embarko.app" className="mx-auto max-w-md -translate-y-2">
            <div className="space-y-3">
              <div className={`${bar} h-16 w-full`} />
              <div className="grid grid-cols-3 gap-2">
                <div className={`${bar} h-10`} />
                <div className={`${bar} h-10`} />
                <div className={`${bar} h-10`} />
              </div>
            </div>
          </AppWindow>
          <div className="space-y-6">
            <h3 className="text-4xl font-bold sm:text-5xl md:text-7xl">It&apos;s live.</h3>
            <div className="space-y-2 text-2xl font-light text-gray-600">
              <p>portfolio.embarko.app</p>
              <p className="font-medium text-green-600">● Live</p>
            </div>
            <button className="bg-black px-8 py-4 text-lg font-medium text-white transition hover:bg-gray-900">
              Open app →
            </button>
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
              <button className="font-medium text-black underline hover:no-underline">Copy prompt →</button>
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
              <div key={app.title} className="space-y-3">
                <AppWindow className="transition hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                  {/* Fixed height so every window in the grid lines up and the
                      captions below sit on a shared baseline. */}
                  <div className="flex h-28 flex-col justify-center">
                    <Sketch variant={app.variant} />
                  </div>
                </AppWindow>
                <div className="px-1">
                  <h3 className="text-lg font-bold">{app.title}</h3>
                  <p className="font-light text-gray-600">{app.desc}</p>
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
                <Sketch variant={app.variant} />
              </AppWindow>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {SKY_APPS.slice(0, 4).map((app) => (
              <AppWindow key={app.label} label={app.label}>
                <Sketch variant={app.variant} />
              </AppWindow>
            ))}
          </div>
        </div>
      </section>

      {/* SCENE 09: THE REALIZATION */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="w-full max-w-3xl space-y-12">
          <AppWindow label="portfolio.embarko.app" className="mx-auto">
            <div className="divide-y divide-black/5">
              {['Sign in', 'It remembers', 'Upload', 'Live'].map((step) => (
                <div key={step} className="flex items-center justify-between py-3">
                  <span className="text-lg font-light text-gray-700">{step}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                </div>
              ))}
            </div>
          </AppWindow>
          <div className="space-y-4 text-center">
            <h3 className="text-3xl font-bold sm:text-4xl md:text-5xl">This isn&apos;t just a page.</h3>
            <p className="text-2xl font-light text-gray-600">It&apos;s a real application.</p>
          </div>
        </div>
      </section>

      {/* SCENE 10: BUILD YOUR WAY */}
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-20">
        <div className="w-full max-w-4xl space-y-12 text-center">
          <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">Build your way.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['Claude', 'Codex', 'Cursor', 'Lovable', 'Replit'].map((ai) => (
              <div key={ai} className="rounded-full border border-gray-200 bg-white px-6 py-3 font-light">
                {ai}
              </div>
            ))}
            <div className="rounded-full border border-gray-200 bg-white px-6 py-3 font-light text-gray-600">
              + more
            </div>
          </div>
          <p className="text-xl font-light text-gray-600">Embarko works with the AI you already use.</p>
        </div>
      </section>

      {/* SCENE 11: THE POSSIBILITIES */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        <SkyBackdrop
          src="/atmosphere/sky-drift.jpg"
          position="center 70%"
          blur={26}
          opacity={0.6}
          saturate={1.15}
          fade="from-white via-transparent to-white"
        />
        <div className="relative z-10 w-full max-w-5xl space-y-12">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {APPS.slice(0, 8).map((app, i) => (
              <AppWindow
                key={app.title}
                className="animate-[float_11s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.45}s` }}
              >
                <Sketch variant={app.variant} />
              </AppWindow>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-12 text-center">
            <h2 className="text-4xl font-bold sm:text-5xl md:text-6xl">What will you build?</h2>
          </div>
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
            <button className="bg-black px-8 py-4 text-lg font-medium text-white transition hover:bg-gray-900">
              Teach your AI to ship →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
