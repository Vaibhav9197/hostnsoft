"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { FEATURES, type Feature } from "../lib/features";
import { Serif } from "./ds/Serif";

/**
 * "What you get, without setting it up" — the replacement for the eight-cell
 * feature grid the landing pages used to carry.
 *
 * The grid stated eight facts and left it there. This picks one at a time and
 * shows it: what it is, what it looks like, and the sentence you would actually
 * say to your agent to get it. That last column is the point of the section —
 * every feature here is something the owner asks for in words rather than
 * configures, and printing the words makes that concrete in a way a paragraph
 * about it cannot.
 *
 * The list itself lives in app/lib/features.ts, shared with the tiles on /v1
 * and /v2 (FeatureTiles). Used by /v3 and /v4 — `tone` picks the palette.
 */

/* Two palettes, one layout. `gray` is the plain Tailwind scale /v1 and /v4 are
   built on; `token` is the semantic palette /v3 shares with the console, which
   also gives that page dark mode for free. */
const TONES = {
  gray: {
    surface: "bg-white",
    inset: "bg-gray-50",
    line: "border-gray-200",
    railActive: "bg-gray-100 text-black",
    railIdle: "text-gray-500 hover:text-black",
    muted: "text-gray-600",
    faint: "text-gray-500",
    quote: "bg-gray-900 text-white",
    accentDot: "bg-gray-900",
    tag: "border-gray-300 text-gray-500",
  },
  token: {
    surface: "bg-card",
    inset: "bg-elevated",
    line: "border-border",
    railActive: "bg-elevated text-foreground",
    railIdle: "text-muted-foreground hover:text-foreground",
    muted: "text-muted-foreground",
    faint: "text-faint",
    quote: "bg-foreground text-background",
    accentDot: "bg-success",
    tag: "border-input text-faint",
  },
} as const;

export type ShowcaseTone = keyof typeof TONES;

/* ── the mockups ──────────────────────────────────────────
   Deliberately drawn in divs rather than screenshotted: a screenshot of the
   product would date on the next release, and at this size the shapes carry
   the idea anyway. Every one is aria-hidden — the prose above it already says
   what it shows, so a screen reader reading out "amber-harbor" twice would be
   noise. */

function Frame({ tone, children, chrome }: { tone: ShowcaseTone; children: ReactNode; chrome?: ReactNode }) {
  const t = TONES[tone];
  return (
    <div className={`overflow-hidden rounded-xl border ${t.line} ${t.surface}`}>
      {chrome && <div className={`flex items-center gap-2 border-b ${t.line} ${t.inset} px-3 py-2`}>{chrome}</div>}
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ tone, left, right, last }: { tone: ShowcaseTone; left: ReactNode; right?: ReactNode; last?: boolean }) {
  const t = TONES[tone];
  return (
    <div className={`flex items-center justify-between gap-3 py-2.5 ${last ? "" : `border-b ${t.line}`}`}>
      <span className="min-w-0 truncate">{left}</span>
      {right && <span className={`shrink-0 font-mono text-[11px] ${t.faint}`}>{right}</span>}
    </div>
  );
}

function Pill({ tone, children }: { tone: ShowcaseTone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${t.line} ${t.surface} px-2 py-0.5 text-[11px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.accentDot}`} />
      {children}
    </span>
  );
}

function mockups(tone: ShowcaseTone) {
  const t = TONES[tone];

  return {
    domain: () => (
      <Frame
        tone={tone}
        chrome={
          <>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <i key={i} className={`h-2 w-2 rounded-full border ${t.line}`} />
              ))}
            </span>
            <span className={`truncate font-mono text-[11px] ${t.muted}`}>amber-harbor.embarko.app</span>
          </>
        }
      >
        <div className="flex items-center justify-between gap-3">
          <Pill tone={tone}>Live</Pill>
          <span className={`font-mono text-[11px] ${t.faint}`}>HTTPS · 12ms</span>
        </div>
        <div className={`mt-4 border-t ${t.line} pt-3 text-[13px]`}>
          <Row tone={tone} left={<span className="font-mono">lookbook.studio</span>} right="connected" last />
        </div>
      </Frame>
    ),

    database: () => (
      <Frame tone={tone}>
        <div className={`mb-1 font-mono text-[10px] uppercase tracking-[0.1em] ${t.faint}`}>sign_ups</div>
        <div className="text-[13px]">
          <Row tone={tone} left="dana@example.com" right="2 min ago" />
          <Row tone={tone} left="sam@example.com" right="1 hr ago" />
          <Row tone={tone} left="jo@studio.co" right="yesterday" last />
        </div>
        <p className={`mt-3 text-[12px] ${t.faint}`}>412 rows</p>
      </Frame>
    ),

    tools: () => (
      <Frame tone={tone}>
        <div className={`mb-2 font-mono text-[10px] uppercase tracking-[0.1em] ${t.faint}`}>Variables</div>
        {/* Masked the way the console masks them, so the drawing doesn't
            suggest the panel shows anyone their keys in the clear. */}
        <div className="text-[13px]">
          <Row tone={tone} left={<span className="font-mono">STRIPE_KEY</span>} right="sk_live_••••" />
          <Row tone={tone} left={<span className="font-mono">RESEND_KEY</span>} right="re_••••" />
          <Row tone={tone} left={<span className="font-mono">OPENAI_API_KEY</span>} right="sk-••••" />
          <Row tone={tone} left={<span className="font-mono">SHEETS_TOKEN</span>} right="ya29••••" last />
        </div>
        <p className={`mt-3 text-[12px] ${t.faint}`}>Handed to your app on every deploy</p>
      </Frame>
    ),

    email: () => (
      <Frame tone={tone}>
        <div className="text-[13px]">
          <Row tone={tone} left="Welcome to Studio Bookings" right="sent" />
          <Row tone={tone} left="Your receipt #1042" right="sent" />
          <Row tone={tone} left="Reset your password" right="sent" last />
        </div>
        <p className={`mt-3 text-[12px] ${t.faint}`}>Sent through your own email service</p>
      </Frame>
    ),

    login: () => (
      <Frame tone={tone}>
        <div className="mx-auto max-w-[260px] py-2 text-center">
          <p className="text-[15px] font-semibold">Sign in</p>
          <div className={`mt-3 rounded-lg border ${t.line} ${t.inset} px-3 py-2 text-left font-mono text-[12px] ${t.faint}`}>
            you@example.com
          </div>
          <div className={`mt-2 rounded-lg ${t.quote} px-3 py-2 text-[13px] font-medium`}>Continue</div>
          <p className={`mt-3 text-[11px] ${t.faint}`}>Accounts and password resets</p>
        </div>
      </Frame>
    ),

    files: () => (
      <Frame tone={tone}>
        <div className="text-[13px]">
          <Row tone={tone} left="spring-lookbook.pdf" right="4.2 MB" />
          <Row tone={tone} left="cover-shot.jpg" right="1.8 MB" />
          <Row tone={tone} left="stock-list.csv" right="24 KB" last />
        </div>
        <div className={`mt-3 rounded-lg border border-dashed ${t.line} py-3 text-center text-[12px] ${t.faint}`}>
          Drop a file
        </div>
      </Frame>
    ),

    backups: () => (
      <Frame tone={tone}>
        <div className="text-[13px]">
          <Row tone={tone} left={<span className="font-medium">Today, 04:00</span>} right="latest" />
          <Row tone={tone} left="Yesterday, 04:00" right="restore" />
          <Row tone={tone} left="Sat, 04:00" right="restore" last />
        </div>
        <p className={`mt-3 text-[12px] ${t.faint}`}>Kept for 30 days</p>
      </Frame>
    ),

    logs: () => (
      <Frame tone={tone}>
        <div className="font-mono text-[12px] leading-relaxed">
          <p className={t.faint}>12:04 GET /checkout 500</p>
          <p className={t.faint}>12:04 Error: STRIPE_KEY is not set</p>
          <p className={t.faint}>12:06 deploy v14 · rolled back to v13</p>
        </div>
        <div className={`mt-3 border-t ${t.line} pt-3`}>
          <Pill tone={tone}>Back to normal</Pill>
        </div>
      </Frame>
    ),

    sharing: () => (
      <Frame tone={tone}>
        <div className="mx-auto max-w-[260px] py-2 text-center">
          <p className="text-[15px] font-semibold">This app is private</p>
          <p className={`mt-1 text-[12px] ${t.faint}`}>Ask the owner for access</p>
          <div className="mt-4 text-left text-[13px]">
            <Row tone={tone} left="dana@studio.co" right="can open" />
            <Row tone={tone} left="sam@studio.co" right="can open" last />
          </div>
        </div>
      </Frame>
    ),

    schedules: () => (
      <Frame tone={tone}>
        <div className="text-[13px]">
          <Row tone={tone} left="Send the weekly report" right="Mon 09:00" />
          <Row tone={tone} left="Clear old carts" right="every night" last />
        </div>
      </Frame>
    ),

    jobs: () => (
      <Frame tone={tone}>
        <div className="text-[13px]">
          <Row tone={tone} left="Resize 240 photos" right="running" />
          <Row tone={tone} left="Import the customer list" right="queued" last />
        </div>
      </Frame>
    ),

    uptime: () => (
      <Frame tone={tone}>
        <div className="flex items-baseline justify-between">
          <Pill tone={tone}>Running</Pill>
          <span className="font-mono text-[18px] font-semibold">99.98%</span>
        </div>
        {/* Thirty days of health, one bar each. The shortest bar is still
            visible so a quiet day doesn't read as missing data. */}
        <div className="mt-4 flex h-10 items-end gap-[3px]">
          {[7, 9, 8, 10, 9, 6, 9, 10, 8, 9, 10, 7, 9, 8, 10, 9, 10, 8, 4, 9, 10, 9, 8, 10, 9, 7, 10, 9, 10, 8].map(
            (h, i) => (
              <i key={i} className={`flex-1 rounded-sm ${t.accentDot}`} style={{ height: `${h * 10}%`, opacity: 0.35 }} />
            ),
          )}
        </div>
        <p className={`mt-3 text-[12px] ${t.faint}`}>Restarted itself once, 6 days ago</p>
      </Frame>
    ),
  };
}

/* The shared list, each feature paired with its drawing. */
function features(tone: ShowcaseTone): (Feature & { Mockup: () => ReactNode })[] {
  const m = mockups(tone);
  return FEATURES.map((f) => ({ ...f, Mockup: m[f.id as keyof typeof m] }));
}

function Tag({ tone, className = "" }: { tone: ShowcaseTone; className?: string }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em] ${TONES[tone].tag} ${className}`}
    >
      Upcoming
    </span>
  );
}

export function FeatureShowcase({
  tone = "gray",
  heading = <>Need more? You <Serif grad>already</Serif> have it.</>,
  body = "Your agent builds the app. What it needs to actually run is already here, so neither of you has to set it up.",
  className = "",
}: {
  tone?: ShowcaseTone;
  heading?: ReactNode;
  body?: string | null;
  className?: string;
}) {
  const t = TONES[tone];
  const items = features(tone);
  const [activeId, setActiveId] = useState(items[0].id);
  const active = items.find((f) => f.id === activeId) ?? items[0];
  /* Ties each rail button to the panel it drives, so the whole thing is one
     tablist to a screen reader instead of six buttons and some text. */
  const panelId = useId();

  return (
    <div className={`w-full max-w-5xl ${className}`}>
      {/* A host that already titles the moment (the /v2 story's last scene)
          passes heading={null} and body={null}, so there aren't two headlines. */}
      {(heading || body) && (
        <div className="max-w-2xl">
          {heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-[44px]">{heading}</h2>}
          {body && <p className={`mt-4 text-lg font-light leading-relaxed ${t.muted}`}>{body}</p>}
        </div>
      )}

      {/* Three columns on a wide screen, stacked below it. The rail turns into
          a horizontal scroller rather than a stack of six full-width rows,
          which would push the content it selects off the screen.

          It scrolls inside the content box rather than bleeding to the screen
          edge: a bleed has to match the host page's side padding or the
          document overflows sideways, and the three pages using this don't
          share one. */}
      <div className={`${heading || body ? "mt-12" : ""} grid gap-8 lg:grid-cols-[244px_minmax(0,1fr)_200px] lg:gap-10`}>
        <div
          role="tablist"
          aria-label="What Embarko handles"
          className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {items.map(({ id, label, Icon, upcoming }) => {
            const selected = id === activeId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={selected ? panelId : undefined}
                onClick={() => setActiveId(id)}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left text-[14px] font-medium transition-colors ${
                  selected ? t.railActive : t.railIdle
                }`}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} className="h-[17px] w-[17px]" />
                {label}
                {upcoming && <Tag tone={tone} className="lg:ml-auto" />}
              </button>
            );
          })}
        </div>

        <div id={panelId} role="tabpanel" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[19px] font-semibold tracking-tight">{active.headline}</h3>
            {active.upcoming && <Tag tone={tone} />}
          </div>
          <p className={`mt-2.5 text-[15px] leading-relaxed ${t.muted}`}>{active.body}</p>
          <div className="mt-6" aria-hidden="true">
            <active.Mockup />
          </div>
          {/* Nothing to read about a feature that isn't built, so the link is
              the one thing the upcoming panels don't carry. */}
          {!active.upcoming && (
            <Link
              href="/docs"
              className={`mt-5 inline-block text-[14px] font-medium underline-offset-4 hover:underline ${t.muted}`}
            >
              More about {active.linkLabel ?? active.label.toLowerCase()} →
            </Link>
          )}
        </div>

        {/* The column that makes the section's argument: none of this is
            configured, it is asked for. Sits last in the source so a narrow
            screen reads feature, then proof, then the words to use. */}
        <div>
          {/* "Tell your agent" over a feature that doesn't exist yet reads as
              an instruction that would fail. */}
          <p className={`font-mono text-[10px] uppercase tracking-[0.12em] ${t.faint}`}>
            {active.upcoming ? "You’ll be able to say" : "Tell your agent"}
          </p>
          <ul className="mt-3.5 flex flex-col gap-2">
            {active.prompts.map((prompt) => (
              <li key={prompt} className={`rounded-lg px-3 py-2 font-mono text-[12px] leading-snug ${t.quote}`}>
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
