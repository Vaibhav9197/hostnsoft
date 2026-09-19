"use client";

import { useEffect, useState } from "react";
import { trackPageView, trackCTA, trackDeployment } from '../lib/tracking';
import { Copy } from "lucide-react";

import { AGENTS, agentIconSrc } from "../lib/agents";
import { CopyPromptButton, COPIED_LABEL } from "../components/CopyPromptButton";
import { FeatureShowcase } from "../components/FeatureShowcase";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { EuropeanHosting, WhyEmbarko } from "../components/WhyEmbarko";

/* In-page anchors for the header's centre slot — this page is long enough that
   jumping between sections matters. */
const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#why", label: "Why Embarko" },
  { href: "#included", label: "What's included" },
  { href: "#examples", label: "Examples" },
  { href: "#agents", label: "Agents" },
] as const;

/* Landing-page variant Gamma — a rebuild of the "light prototype" layout on this
   site's own palette. The prototype's geometry, copy and rhythm are kept as-is;
   every colour comes from the tokens in base.css via the semantic Tailwind
   names in tailwind.config.js (background/foreground/card/elevated/border/
   success/primary), so the page tracks the rest of the site automatically.

   The one mapping worth knowing: the prototype's amber "beacon" accent has no
   equivalent here — this site's --accent IS black, with --ok green reserved for
   live/success. So beacon CTAs became black buttons, and the small accent marks
   that signalled "live" (logo dot, eyebrow bullet, deploy ticks) became green.

   Radii are written as arbitrary values because tailwind.config.js pins every
   radius token to 0 for the console's sharp-cornered style; this page keeps the
   prototype's rounded cards. */

const DEPLOY_STEPS = ["Installing dependencies", "Building app", "Making it live"] as const;

/* One elapsed-ms counter drives the whole hero sequence, rather than nested
   timers, so every derived phase stays deterministic and easy to re-time —
   the same approach the other variants use for their deploy animations. */
const TICK_MS = 100;
const STEP_MS = 1100;
const LIVE_HOLD_MS = 2600;
const CYCLE_MS = DEPLOY_STEPS.length * STEP_MS + LIVE_HOLD_MS;

function AgentMark({ slug }: { slug: string }) {
  return (
    <img
      src={agentIconSrc(slug)}
      alt=""
      aria-hidden="true"
      className="h-5 w-5 shrink-0 object-contain"
    />
  );
}

const FLOW = [
  {
    num: "01",
    title: "Copy the deployment prompt",
    body: "One prompt tells your agent exactly how to ship your app to Embarko. You don't need to understand it — just hand it over.",
    extra: null,
  },
  {
    num: "02",
    title: "Paste it into your AI agent",
    body: "Claude, Cursor, Gemini, Copilot, or Replit — your agent reads the prompt, calls Embarko, and your app gets its own URL.",
    extra: "agents",
  },
] as const;

/* Miniature app screens for the example cards, in the spirit of v4's
   world-apps: abstract UI furniture rather than screenshots, so each card
   suggests the shape of an app without pretending to be a real product. Drawn
   from ink at a few opacities with one green accent apiece — the palette has no
   hues to spend, so structure does the work the prototype's colours did. */
/* Tailwind cannot derive an alpha channel from an arbitrary var() colour, so
   `bg-foreground/20` and friends compile to a declaration the browser drops —
   silently, leaving the shape invisible. Every tint below therefore names its
   own colour, kept derived from the tokens with color-mix. */
const inkTint = (pct: number) => `color-mix(in srgb, var(--ink) ${pct}%, transparent)`;
const okTint = (pct: number) => `color-mix(in srgb, var(--ok) ${pct}%, transparent)`;

function TripPlannerArt() {
  /* A route: waypoints threaded on a line, the destination live. */
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      <div className="h-1.5 w-14 rounded-[2px]" style={{ background: inkTint(20) }} />
      <div className="relative flex items-center justify-between">
        <span className="absolute inset-x-1 h-px" style={{ background: inkTint(15) }} />
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="relative h-2 w-2 rounded-full"
            style={{ background: i === 2 ? "var(--ok)" : inkTint(30) }}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        <span className="h-1 w-8 rounded-[2px]" style={{ background: inkTint(20) }} />
        <span className="h-1 w-12 rounded-[2px]" style={{ background: inkTint(20) }} />
      </div>
    </div>
  );
}

function BookingArt() {
  /* A month grid with one slot taken. */
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <div className="h-1.5 w-10 rounded-[2px]" style={{ background: inkTint(20) }} />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 21 }, (_, i) => (
          <span
            key={i}
            className="h-[5px] rounded-[1px]"
            style={{ background: i === 9 ? "var(--ok)" : inkTint(12) }}
          />
        ))}
      </div>
    </div>
  );
}

function StudyArt() {
  /* A deck seen from the front, over a review streak. */
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="relative h-8">
        <span
          className="absolute left-3 top-0 h-7 w-20 rounded-[4px] border"
          style={{ background: inkTint(6), borderColor: inkTint(10) }}
        />
        <span
          className="absolute left-1.5 top-1 h-7 w-20 rounded-[4px] border bg-card"
          style={{ borderColor: inkTint(15) }}
        />
        <span className="absolute left-3 top-3 h-1 w-12 rounded-[2px]" style={{ background: inkTint(20) }} />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: i < 5 ? "var(--ok)" : inkTint(12) }}
          />
        ))}
      </div>
    </div>
  );
}

function BoardArt() {
  /* Three columns, cards stacking up in the middle one. */
  return (
    <div className="flex h-full items-start gap-2 py-2.5">
      {[2, 3, 1].map((cards, col) => (
        <div key={col} className="flex flex-1 flex-col gap-1">
          <span className="h-1 w-6 rounded-[2px]" style={{ background: inkTint(20) }} />
          {Array.from({ length: cards }, (_, i) => (
            <span
              key={i}
              className="h-3 rounded-[2px]"
              style={{ background: col === 1 && i === 0 ? okTint(30) : inkTint(10) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PortfolioArt() {
  /* A gallery: one hero piece, two supporting. */
  return (
    <div className="flex h-full gap-1.5 py-2.5">
      <div className="h-full flex-[1.4] rounded-[3px]" style={{ background: inkTint(10) }} />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex-1 rounded-[3px]" style={{ background: inkTint(10) }} />
        <div className="flex-1 rounded-[3px]" style={{ background: okTint(25) }} />
      </div>
    </div>
  );
}

function RecipeArt() {
  /* A card from a recipe box: photo, title, timing. */
  return (
    <div className="flex h-full items-center gap-2 py-2.5">
      <div className="h-full w-12 shrink-0 rounded-[3px]" style={{ background: inkTint(12) }} />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="h-1.5 w-16 rounded-[2px]" style={{ background: inkTint(20) }} />
        <span className="h-1 w-10 rounded-[2px]" style={{ background: inkTint(12) }} />
        <span className="h-1 w-14 rounded-[2px]" style={{ background: inkTint(12) }} />
      </div>
    </div>
  );
}

function InvoiceArt() {
  /* One invoice, settled — the amount and its paid mark. */
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="h-1 w-10 rounded-[2px]" style={{ background: inkTint(15) }} />
      <div className="h-3 w-16 rounded-[2px]" style={{ background: inkTint(25) }} />
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="h-1 w-8 rounded-[2px]" style={{ background: okTint(35) }} />
      </div>
    </div>
  );
}

function AlbumArt() {
  /* A photo grid, one shot picked out. */
  return (
    <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 py-2.5">
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={{ background: i === 1 ? okTint(25) : inkTint(12) }}
        />
      ))}
    </div>
  );
}

function NotesArt() {
  /* Shared notes: a few lines and the people on them. */
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <div className="h-1.5 w-12 rounded-[2px]" style={{ background: inkTint(20) }} />
      <div className="h-1 w-20 rounded-[2px]" style={{ background: inkTint(12) }} />
      <div className="h-1 w-16 rounded-[2px]" style={{ background: inkTint(12) }} />
      <div className="mt-1 flex">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="-ml-1 h-3 w-3 rounded-full border-2 border-[var(--surface-2)] first:ml-0"
            style={{ background: inkTint(22) }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatToolArt() {
  /* A little AI tool: two turns and an input waiting. */
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <span className="h-2.5 w-16 self-end rounded-[4px]" style={{ background: inkTint(22) }} />
      <span className="h-2.5 w-20 rounded-[4px]" style={{ background: inkTint(12) }} />
      <span
        className="mt-1 h-3 rounded-[4px] border"
        style={{ borderColor: inkTint(15), background: inkTint(4) }}
      />
    </div>
  );
}

const EXAMPLES = [
  { Art: TripPlannerArt, title: "Trip planner", body: "A Barcelona itinerary builder, built in an afternoon." },
  { Art: BookingArt, title: "Booking app", body: "Lets clients book time slots without a spreadsheet." },
  { Art: StudyArt, title: "Study tracker", body: "Tracks flashcard decks and daily review streaks." },
  { Art: BoardArt, title: "Project board", body: "A Kanban board scoped to one small team." },
  { Art: PortfolioArt, title: "Portfolio", body: "A designer's work, live at their own URL." },
  { Art: ChatToolArt, title: "AI tool", body: "Answers questions from one team's own docs." },
  { Art: RecipeArt, title: "Recipe box", body: "Family recipes, finally out of the group chat." },
  { Art: InvoiceArt, title: "Invoices", body: "Sends invoices and marks them paid." },
  { Art: AlbumArt, title: "Photo album", body: "A shared album for one weekend away." },
  { Art: NotesArt, title: "Team notes", body: "Meeting notes everyone can actually find." },
] as const;

const BTN =
  "inline-flex items-center gap-2 rounded-[8px] px-[18px] py-[10px] text-sm font-semibold transition active:scale-[0.97]";
const BTN_PRIMARY = `${BTN} bg-primary text-primary-foreground hover:bg-[var(--accent-2)]`;
const BTN_GHOST = `${BTN} border border-border text-foreground hover:border-[var(--line-strong)]`;
const BTN_SM = "rounded-[6px] px-3 py-[7px] text-[13px]";

const WRAP = "mx-auto w-full max-w-[1120px] px-8 max-[640px]:px-5";
const LABEL = "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

/* ── hero ──────────────────────────────────────────────── */

function DeployPanel() {
  const [elapsed, setElapsed] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    trackPageView();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const id = window.setInterval(() => setElapsed((e) => (e + TICK_MS) % CYCLE_MS), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  /* Reduced motion gets the finished state — the payoff without the theatre. */
  const activeIndex = reduced ? DEPLOY_STEPS.length : Math.floor(elapsed / STEP_MS);
  const liveShown = reduced || elapsed >= DEPLOY_STEPS.length * STEP_MS;

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_20px_45px_-18px_rgba(20,18,16,0.16)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-elevated px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full" style={{ background: inkTint(25) }} />
        ))}
        <span className="ml-2 font-mono text-xs text-muted-foreground">deploy.log</span>
      </div>

      <div className="px-5 py-[22px] font-mono text-[13.5px]">
        <div className="mb-3.5 flex items-start gap-2.5">
          <span className="mt-px shrink-0 rounded-[5px] bg-elevated px-2 py-[3px] text-[11px] font-medium text-muted-foreground">
            AGENT
          </span>
          <span className="leading-relaxed text-foreground">
            &ldquo;The app is ready. Deploying to Embarko now.&rdquo;
          </span>
        </div>
        <div className="mb-3.5 flex items-start gap-2.5">
          <span className="mt-px shrink-0 rounded-[5px] bg-foreground px-2 py-[3px] text-[11px] font-medium text-background">
            EMBARKO
          </span>
          <span className="leading-relaxed text-muted-foreground">Received build. Starting deployment.</span>
        </div>

        <div className="my-3.5 pl-0.5">
          {DEPLOY_STEPS.map((label, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            return (
              <div
                key={label}
                className={`flex items-center gap-2.5 py-1.5 text-[13px] transition-all duration-300 ${
                  done
                    ? "text-success opacity-75"
                    : active
                      ? "text-foreground opacity-100"
                      : "text-muted-foreground opacity-35"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[9px] transition-all duration-300 ${
                    done
                      ? "border-success bg-success text-background"
                      : active
                        ? "border-foreground"
                        : "border-[color-mix(in_srgb,var(--ink)_30%,transparent)]"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                {label}
              </div>
            );
          })}
        </div>

        <div
          className={`mt-4 flex items-center justify-between rounded-[9px] border border-foreground bg-foreground px-4 py-3.5 transition-all duration-400 ${
            liveShown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-30"
          }`}
        >
          <span className="font-mono text-[13.5px] text-background">weekend.embarko.app</span>
          <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="py-[88px] max-[900px]:py-14">
      <div className={`${WRAP} grid grid-cols-[1.05fr_0.95fr] items-center gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-13`}>
        <div>
          <div className="mb-5 flex items-center gap-2 font-mono text-[13px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            FROM AI-BUILT TO LIVE
          </div>

          <h1 className="mb-8 max-w-[560px] text-[52px] font-semibold leading-[1.08] tracking-[-0.02em] max-[900px]:text-[38px] max-[420px]:text-[32px]">
            Instant hosting for every app you build with AI
          </h1>

          <div className="flex flex-wrap items-center gap-[18px]">
            <CopyPromptButton className={BTN_PRIMARY} copiedChildren={COPIED_LABEL} onClicked={() => trackCTA('copy')}>
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copy deployment prompt
            </CopyPromptButton>
            <a href="#how" className={BTN_GHOST}>
              See how it works
            </a>
          </div>
        </div>

        <DeployPanel />
      </div>
    </header>
  );
}

/* ── shared section head ───────────────────────────────── */

function SectionHead({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-[52px] max-w-[560px]">
      <h2 className="mb-3.5 text-[32px] font-semibold leading-tight tracking-[-0.015em]">{title}</h2>
      <p className="text-[16.5px] leading-[1.6] text-muted-foreground">{body}</p>
    </div>
  );
}

/* ── how it works ──────────────────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 py-[88px] max-[720px]:py-[60px]">
      <div className={WRAP}>
        <SectionHead
          title="Two steps. Your AI does the rest."
          body="You don't write config files or click through a hosting dashboard. You copy one thing and hand it to the AI agent you're already using."
        />

        <div className="flex flex-col">
          {FLOW.map((step) => (
            <div
              key={step.num}
              className="grid grid-cols-[32px_1fr] gap-5 border-t border-border py-8 last:border-b max-[640px]:grid-cols-1 max-[640px]:gap-3"
            >
              <div className="pt-[3px] font-mono text-sm text-muted-foreground">{step.num}</div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="max-w-[520px] text-[15.5px] leading-[1.6] text-muted-foreground">
                  {step.body}
                </p>

                {step.extra === "agents" && (
                  <div className="mt-4 flex max-w-[560px] flex-wrap gap-2">
                    {AGENTS.map((agent) => (
                      <span
                        key={agent.slug}
                        className="flex items-center gap-1.5 rounded-[7px] border border-border px-2.5 py-[6px] font-mono text-[12.5px] text-muted-foreground"
                      >
                        <img
                          src={agentIconSrc(agent.slug)}
                          alt=""
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                        {agent.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── prompt ────────────────────────────────────────────── */

function PromptSection() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <section id="prompt-section" className="scroll-mt-16 py-[88px] max-[720px]:py-[60px]">
      <div className={WRAP}>
        <SectionHead
          title="Copy this prompt to your AI agent"
          body="This is the whole handoff. Paste it into Claude, Cursor, Gemini, Copilot, or Replit and let your agent handle the rest."
        />

        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="p-7">
            <div className={`${LABEL} mb-2.5`}>What this does</div>
            <div className="mb-[18px] rounded-[9px] bg-foreground px-5 py-[18px] font-mono text-[14.5px] leading-[1.7] text-background">
              Tells your AI agent exactly how to send your app to Embarko —
              <br />
              the address to call, the token to use, and the file to send.
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              <CopyPromptButton onClicked={() => trackCTA('copy')}
                className={BTN_PRIMARY}
                copiedChildren={COPIED_LABEL}
                onCopied={() => setCopied(true)}
              >
                <Copy aria-hidden="true" className="h-4 w-4" />
                Copy deployment prompt
              </CopyPromptButton>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="prompt-technical"
                className="flex items-center gap-1.5 py-1.5 text-sm text-muted-foreground underline decoration-border underline-offset-[3px] transition-colors hover:text-foreground"
              >
                <span className={`text-[11px] transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
                {open ? "Hide technical details" : "What's actually in it?"}
              </button>

              <span
                className={`font-mono text-[13px] text-success transition-opacity ${copied ? "opacity-100" : "opacity-0"}`}
                aria-live="polite"
              >
                Copied — paste it into your agent
              </span>
            </div>
          </div>

          <div
            id="prompt-technical"
            className={`overflow-hidden border-t border-border transition-[max-height] duration-[350ms] ${
              open ? "max-h-[600px]" : "max-h-0"
            }`}
          >
            <div className="bg-elevated px-7 py-6">
              <div className={`${LABEL} mb-3.5`}>Exactly what gets copied</div>
              <pre className="overflow-x-auto rounded-[9px] bg-foreground p-5 font-mono text-[13.5px] leading-[1.9] text-background">
{`# Deploy this to Embarko:
POST https://ship.embarko.ai/apps

Authorization: Bearer $DEPLOY_TOKEN
X-App-Name: <name>
source=<tarball of the app>

# Full docs: https://embarko.ai/docs/docs.md
# Optional helper skill (not required — the call above works standalone):
npx skills add embarko-ai/skill --skill embarko-deploy -g`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── what's included ───────────────────────────────────── */

function Included() {
  return (
    <section id="included" className="scroll-mt-16 bg-card py-[88px] max-[720px]:py-[60px]">
      <div className={WRAP}>
        <FeatureShowcase tone="token" className="max-w-none" />
      </div>
    </section>
  );
}

/* ── examples ──────────────────────────────────────────── */

function Examples() {
  return (
    <section id="examples" className="scroll-mt-16 py-[88px] max-[720px]:py-[60px]">
      <div className={WRAP}>
        <SectionHead
          title="Whatever your agent builds, Embarko gives it a home."
          body="These all started as prompts. Now they're real apps, live on the internet."
        />
      </div>

      {/* One row, always full. The cards are equal fractions of the rail rather
          than a fixed width, and the ones that would squeeze past ~165px are
          dropped instead of wrapping or scrolling — so the row ends flush at
          every viewport. Each rule only ever hides, and the max-width queries
          stack, so no rule has to out-specify another.

          The rail runs the full width of the viewport rather than the 1120px
          content column, so wide screens earn more cards. */}
      <div
        className="mx-8 grid grid-flow-col auto-cols-fr gap-4 max-[640px]:mx-5
          max-[1859px]:[&>*:nth-child(n+10)]:hidden
          max-[1679px]:[&>*:nth-child(n+9)]:hidden
          max-[1499px]:[&>*:nth-child(n+8)]:hidden
          max-[1319px]:[&>*:nth-child(n+7)]:hidden
          max-[1139px]:[&>*:nth-child(n+6)]:hidden
          max-[959px]:[&>*:nth-child(n+5)]:hidden
          max-[779px]:[&>*:nth-child(n+4)]:hidden
          max-[599px]:[&>*:nth-child(n+3)]:hidden"
      >
        {EXAMPLES.map(({ Art, title, body }) => (
          <div key={title} className="rounded-[12px] border border-border bg-card p-5">
            {/* Decorative — the title and description below carry the meaning. */}
            <div
              aria-hidden="true"
              className="mb-4 h-20 overflow-hidden rounded-[8px] border border-border bg-elevated px-3"
            >
              <Art />
            </div>
            <h4 className="mb-1.5 text-[15px] font-semibold">{title}</h4>
            <p className="text-[13px] leading-[1.5] text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className={WRAP}>
        <div className="mt-9 border-t border-border pt-6 text-[17px] font-medium">
          If AI can build it, <span className="font-normal text-muted-foreground">Embarko can give it a home online.</span>
        </div>
      </div>
    </section>
  );
}

/* ── agents ────────────────────────────────────────────── */

function Agents() {
  return (
    <section id="agents" className="scroll-mt-16 py-[88px] max-[720px]:py-[60px]">
      <div className={WRAP}>
        <SectionHead
          title="Use the AI agent you already use."
          body="Embarko doesn't ask you to switch tools. It works with the agent that's already building your app."
        />
        <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-border bg-card px-7 py-9">
          {AGENTS.map((agent) => (
            <div
              key={agent.slug}
              className="flex items-center gap-2.5 rounded-[8px] border border-border bg-elevated px-4 py-2.5 font-mono text-[14.5px] text-foreground"
            >
              <AgentMark slug={agent.slug} />
              {agent.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── final cta + footer ────────────────────────────────── */

function FinalCta() {
  return (
    <section className="pb-20 pt-24">
      <div className={WRAP}>
        <h2 className="mb-5 max-w-[640px] text-[38px] font-semibold leading-[1.15] tracking-[-0.02em] max-[600px]:text-[28px]">
          Build it with AI. Put it in front of real people. Keep improving it.
        </h2>
        <p className="mb-[34px] max-w-[480px] text-[17px] text-muted-foreground">
          The same app. Now on the internet.
        </p>
        <CopyPromptButton className={BTN_PRIMARY} copiedChildren={COPIED_LABEL} onClicked={() => trackCTA('copy')}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy deployment prompt
        </CopyPromptButton>
      </div>
    </section>
  );
}

/* ── page ──────────────────────────────────────────────── */

export default function EmbarkoV3() {
  return (
    /* pt-16 clears SiteHeader, which is fixed rather than sticky. */
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader links={NAV_LINKS} />
      <Hero />
      <HowItWorks />
      <WhyEmbarko tone="token" />
      <PromptSection />
      <Included />
      <Examples />
      <Agents />
      <EuropeanHosting tone="token" />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
