"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, Database, FolderOpen, Globe, HardDrive, KeyRound } from "lucide-react";

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
 * Shared by /v1, /v3 and /v4, which are three different palettes over the same
 * content — hence `tone` rather than three copies of the markup.
 */

type Feature = {
  id: string;
  /* The rail label. One word where possible: it is read as a list. */
  label: string;
  Icon: typeof Globe;
  headline: string;
  body: string;
  /* What the owner types into their agent. Written as speech, because that is
     what it is — not commands, and not a CLI. */
  prompts: string[];
  Mockup: () => ReactNode;
  /* Not built yet. Says so on the rail and again in the panel, because the
     mockup below it draws a working feature and a drawing is persuasive
     enough to be mistaken for one. */
  upcoming?: boolean;
};

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
            <span className={`truncate font-mono text-[11px] ${t.muted}`}>amber-harbor.app.embarko.ai</span>
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
          <Row tone={tone} left="dana@acme.com" right="2 min ago" />
          <Row tone={tone} left="sam@acme.com" right="1 hr ago" />
          <Row tone={tone} left="jo@studio.co" right="yesterday" last />
        </div>
        <p className={`mt-3 text-[12px] ${t.faint}`}>412 rows</p>
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
          <p className={`mt-3 text-[11px] ${t.faint}`}>Accounts and resets already work</p>
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

/* Shipped first, then what is coming. A rail that opens on something the owner
   can't have yet sells the wrong thing, and mixing the two in one list leaves
   them checking every row for a tag. */
function features(tone: ShowcaseTone): Feature[] {
  const m = mockups(tone);
  return [
    {
      id: "domain",
      label: "Domain",
      Icon: Globe,
      headline: "A live address, the moment it deploys",
      body: "Every deploy comes back with a URL you can send to anyone. Bring your own domain when you are ready and your agent points it here.",
      prompts: ["“Deploy this to Embarko”", "“Point shop.mysite.com at it”", "“Is it live yet?”"],
      Mockup: m.domain,
    },
    {
      id: "database",
      label: "Database",
      Icon: Database,
      headline: "Somewhere to keep what your app saves",
      body: "Orders, notes, sign-ups. Your app can write and read from its first deploy — nothing to provision, no connection string to paste in.",
      prompts: ["“Save the sign-ups”", "“Add a table for orders”", "“What’s in the database?”"],
      Mockup: m.database,
    },
    {
      id: "uptime",
      label: "Uptime",
      Icon: Activity,
      headline: "It stays up while you are not looking",
      body: "Embarko restarts the app if it stops and renews HTTPS before it lapses. When something does need you, it says so in plain words.",
      prompts: ["“Is anything wrong?”", "“Why did it restart?”", "“Check on my app”"],
      Mockup: m.uptime,
    },
    {
      id: "login",
      label: "Login",
      Icon: KeyRound,
      headline: "Let people sign in without building it",
      body: "Accounts, sessions and password resets, ready to switch on. You will ask for them and they appear, instead of sitting down to design an auth flow.",
      prompts: ["“Add login to this”", "“Only let my team in”", "“Add Google sign-in”"],
      Mockup: m.login,
      upcoming: true,
    },
    {
      id: "files",
      label: "Files",
      Icon: FolderOpen,
      headline: "Room for whatever people upload",
      body: "Photos, PDFs, spreadsheets. Your app will take files and hand them back, with the space for them growing as it fills.",
      prompts: ["“Let people upload photos”", "“Keep the PDFs”", "“Show the uploads as a gallery”"],
      Mockup: m.files,
      upcoming: true,
    },
    {
      id: "backups",
      label: "Backups",
      Icon: HardDrive,
      headline: "Yesterday is still there",
      body: "Your data copied on a schedule and kept, so when something goes wrong your agent can put an earlier version back.",
      prompts: ["“Roll back to yesterday”", "“When was the last backup?”", "“Restore what I deleted”"],
      Mockup: m.backups,
      upcoming: true,
    },
  ];
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
  heading = "A link to your app — and everything under it.",
  body = "Your agent builds the app. What it needs in order to actually run is already here, so neither of you has to go and set it up.",
  className = "",
}: {
  tone?: ShowcaseTone;
  heading?: string;
  body?: string;
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
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-[44px]">{heading}</h2>
        <p className={`mt-4 text-lg font-light leading-relaxed ${t.muted}`}>{body}</p>
      </div>

      {/* Three columns on a wide screen, stacked below it. The rail turns into
          a horizontal scroller rather than a stack of six full-width rows,
          which would push the content it selects off the screen.

          It scrolls inside the content box rather than bleeding to the screen
          edge: a bleed has to match the host page's side padding or the
          document overflows sideways, and the three pages using this don't
          share one. */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)_200px] lg:gap-10">
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
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[14px] font-medium transition-colors ${
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
              See how {active.label.toLowerCase()} works →
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
