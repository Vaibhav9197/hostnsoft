"use client";

import { useEffect, useState } from "react";
import { trackPageView, trackCTA, trackDeployment } from '../lib/tracking';

import { AGENTS, agentIconSrc } from "../lib/agents";
import { FeatureShowcase } from "../components/FeatureShowcase";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { InfrastructureTrust, WhyEmbarko } from "../components/WhyEmbarko";
import { ButtonLink, Card, CtaSection, GlowBackdrop, Hero as DsHero, PrimaryCta, Section, SectionHeading, Serif } from "@/app/components/ds";
import "./v3.css";

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

/* Page-specific bits the ds layer lacks live in ./v3.css (prefixed v3-). */
const CTA = () => <PrimaryCta onClicked={() => trackCTA("copy")} />;

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
    <div className="v3-panel ds-card">
      <div className="flex items-center gap-1.5 border-b border-[var(--ds-line)] bg-[var(--ds-soft)] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full" style={{ background: inkTint(25) }} />
        ))}
        <span className="ml-2 font-mono text-xs text-muted-foreground">deploy.log</span>
      </div>

      <div className="px-5 py-[22px] text-left font-mono text-[13.5px]">
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
          className={`mt-4 flex items-center justify-between v3-livebar px-4 py-3.5 transition-all duration-400 ${
            liveShown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-30"
          }`}
        >
          <span className="font-mono text-[13.5px] text-white [overflow-wrap:anywhere]">weekend.embarko.app</span>
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
    <div className="ds-wrap">
      <DsHero
        eyebrow="From AI-built to live"
        title={
          <>
            Instant hosting for every app you <Serif grad>build</Serif> with AI
          </>
        }
        sub="From simple websites and internal tools to full agentic applications."
        actions={
          <>
            <CTA />
            <ButtonLink href="#how" size="lg">
              See how it works
            </ButtonLink>
          </>
        }
        className="v3-hero"
      />
      <div className="v3-panel-wrap">
        <GlowBackdrop position="full" />
        <DeployPanel />
      </div>
    </div>
  );
}

/* ── one copy CTA per section ──────────────────────────── */

function SectionCta() {
  return (
    <div className="v3-cta">
      <CTA />
    </div>
  );
}

/* ── how it works ──────────────────────────────────────── */

function HowItWorks() {
  return (
    <Section id="how" labelledBy="how-h" className="v3-anchor">
      <SectionHeading
        id="how-h"
        kicker="01 — How it works"
        title={
          <>
            Two steps. Your AI does the <Serif>rest</Serif>.
          </>
        }
        sub="You don't write config files or click through a hosting dashboard. You copy one thing and hand it to the AI agent you're already using."
      />

      <ol className="v3-flow">
        {FLOW.map((step) => (
          <Card as="li" key={step.num}>
            <span className="v3-num">{step.num}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {step.extra === "agents" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {AGENTS.map((agent) => (
                  <span key={agent.slug} className="v3-chip">
                    <img src={agentIconSrc(agent.slug)} alt="" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 object-contain" />
                    {agent.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </ol>
      <SectionCta />
    </Section>
  );
}

/* ── shared blocks (WhyEmbarko, FeatureShowcase, InfrastructureTrust) ──
   Those components carry their own padding, column and surface. Here they sit
   inside a ds card: their spacing and background are neutralised and ./v3.css
   restyles their headings to the ds scale. */

function SharedBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="ds-section ds-wrap">
      <Card className="v3-shared">{children}</Card>
    </div>
  );
}
const SHARED_SECTION = "!bg-transparent !py-0";
const SHARED_WRAP = "!max-w-none !px-0";

/* ── prompt ────────────────────────────────────────────── */

function PromptSection() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <Section id="prompt-section" labelledBy="prompt-h" className="v3-anchor">
      <SectionHeading
        id="prompt-h"
        kicker="03 — The prompt"
        title={
          <>
            Copy this <Serif>prompt</Serif> to your AI agent
          </>
        }
        sub="This is the whole handoff. Paste it into Claude, Cursor, Gemini, Copilot, or Replit and let your agent handle the rest."
      />

      <Card className="v3-prompt">
        <div className="p-6 max-[600px]:p-4">
          <span className="ds-kicker">What this does</span>
          <div className="v3-dark mb-[18px] px-5 py-[18px] font-mono text-[14.5px] leading-[1.7]">
            Tells your AI agent everything it needs to put your app
            <br className="max-[600px]:hidden" /> online with Embarko. You don&apos;t need to touch any settings.
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            <PrimaryCta onClicked={() => trackCTA("copy")} onCopied={() => setCopied(true)} />

            <span
              className={`font-mono text-[13px] text-success motion-safe:transition-opacity ${copied ? "opacity-100" : "opacity-0"}`}
              aria-live="polite"
            >
              Copied — paste it into your agent
            </span>
          </div>
        </div>

      </Card>
    </Section>
  );
}

/* ── examples ──────────────────────────────────────────── */

function Examples() {
  return (
    <Section id="examples" labelledBy="examples-h" wrap={false} className="v3-anchor">
      <div className="ds-wrap">
        <SectionHeading
          id="examples-h"
          kicker="05 — Examples"
          title={
            <>
              Whatever your agent builds, Embarko gives it a <Serif>home</Serif>.
            </>
          }
          sub="These all started as prompts. Now they're real apps, live on the internet."
        />
      </div>

      {/* One row, always full: cards that would squeeze past ~165px are hidden
          rather than wrapping or scrolling, so the row ends flush everywhere. */}
      <div
        className="v3-rail grid grid-flow-col auto-cols-fr gap-4
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
          <Card key={title} className="!p-4">
            {/* Decorative — the title and description below carry the meaning. */}
            <div aria-hidden="true" className="v3-art mb-4 h-20 overflow-hidden px-3">
              <Art />
            </div>
            <h3 className="!text-[15px]">{title}</h3>
            <p className="!text-[13px] leading-[1.5]">{body}</p>
          </Card>
        ))}
      </div>

      <div className="ds-wrap">
        <div className="mt-8 border-t border-[var(--ds-line)] pt-6 text-[17px] font-medium">
          If AI can build it, <span className="font-normal text-[var(--ds-mute)]">Embarko can give it a home online.</span>
        </div>
        <SectionCta />
      </div>
    </Section>
  );
}

/* ── agents ────────────────────────────────────────────── */

function Agents() {
  return (
    <Section id="agents" labelledBy="agents-h" className="v3-anchor">
      <SectionHeading
        id="agents-h"
        kicker="06 — Agents"
        title={
          <>
            Use the AI agent you <Serif>already</Serif> use.
          </>
        }
        sub="Embarko doesn't ask you to switch tools. It works with the agent that's already building your app."
      />
      <Card className="flex flex-wrap items-center gap-3">
        {AGENTS.map((agent) => (
          <div key={agent.slug} className="v3-chip v3-chip-lg">
            <AgentMark slug={agent.slug} />
            {agent.name}
          </div>
        ))}
      </Card>
      <SectionCta />
    </Section>
  );
}

/* ── page ──────────────────────────────────────────────── */

export default function EmbarkoV3() {
  return (
    /* pt-16 clears SiteHeader, which is fixed rather than sticky. */
    <main className="v3 min-h-[100dvh] overflow-x-clip bg-background pt-16 text-foreground antialiased">
      <SiteHeader links={NAV_LINKS} />
      <Hero />
      <HowItWorks />
      <SharedBlock>
        <span className="ds-kicker">02 — Why Embarko</span>
        <WhyEmbarko tone="token" className={SHARED_SECTION} wrapClassName={SHARED_WRAP} cta={<CTA />} />
      </SharedBlock>
      <PromptSection />
      <div id="included" className="v3-anchor">
        <SharedBlock>
          <span className="ds-kicker">04 — What&apos;s included</span>
          <FeatureShowcase tone="token" className="max-w-none" />
          <SectionCta />
        </SharedBlock>
      </div>
      <Examples />
      <Agents />
      <SharedBlock>
        <InfrastructureTrust tone="token" className={SHARED_SECTION} wrapClassName={SHARED_WRAP} cta={<CTA />} />
      </SharedBlock>
      <div className="ds-wrap">
        <CtaSection
          id="final"
          title={
            <>
              Build it with AI. Put it in front of real people. Keep <Serif>improving</Serif> it.
            </>
          }
          line="The same app. Now on the internet."
          action={<CTA />}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
