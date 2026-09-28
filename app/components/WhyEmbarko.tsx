import { CheckCircle2, ChevronRight, Globe2, Lock, ShieldCheck } from "lucide-react";

import { INFRA_TRUST, WHY_EMBARKO } from "../lib/trust";
import { cn } from "../lib/utils";

/**
 * "Why Embarko" and the infrastructure-trust section.
 *
 * Both read their text from app/lib/trust.ts — see the long note at the top of
 * that file for what these claims are allowed to say. Nothing in here should
 * hard-code a fact; if a string needs changing, it changes there.
 *
 * Two palettes, same markup, matching FeatureShowcase: `gray` is the plain
 * Tailwind scale that /v1, /v2 and /v4 are built on, `token` is the semantic
 * palette /v3 shares with the console (and which gets dark mode for free).
 */

export type TrustTone = "gray" | "token";

const TONES = {
  gray: {
    surface: "bg-white",
    inset: "bg-gray-50",
    line: "border-gray-200",
    heading: "text-black",
    muted: "text-gray-600",
    faint: "text-gray-500",
    icon: "text-gray-900",
    badge: "border-gray-300 text-gray-600",
  },
  token: {
    surface: "bg-background",
    inset: "bg-card",
    line: "border-border",
    heading: "text-foreground",
    muted: "text-muted-foreground",
    faint: "text-faint",
    icon: "text-foreground",
    badge: "border-input text-faint",
  },
} as const;

/* One icon per trust point, keyed by id so reordering trust.ts cannot
   silently pair the wrong icon with the wrong sentence. Every id in
   INFRA_TRUST.points must appear here, or the icon lookup yields undefined
   and the section throws at render. */
const TRUST_ICONS = {
  iso: ShieldCheck,
  isolation: Lock,
  encryption: Globe2,
  gdpr: CheckCircle2,
} as const;

const WRAP = "mx-auto w-full max-w-[1120px] px-8 max-[640px]:px-5";

/**
 * The six reasons, as a plain three-column list. No cards, no borders per
 * item: CLAUDE.md asks for calm, and six bordered boxes is a dashboard.
 */
export function WhyEmbarko({
  tone = "gray",
  id = "why",
  title = "Why Embarko",
  standfirst = "Your agent builds the app. Embarko is the part that keeps it online.",
  className = "py-[88px] max-[720px]:py-[60px]",
  wrapClassName,
  cta,
}: {
  tone?: TrustTone;
  id?: string;
  title?: string;
  standfirst?: string;
  /** Vertical rhythm. /v1 overrides this to make the section a full-height scene. */
  className?: string;
  /** Overrides the content column. Passed `px-0 max-w-none` when this renders
      inside a dialog, which supplies its own padding and width. */
  wrapClassName?: string;
  /** Opt-in call to action rendered below the section content. Landing
      variants pass their copy-prompt button; other pages leave it out. */
  cta?: React.ReactNode;
}) {
  const t = TONES[tone];

  return (
    /* cn() rather than a template string: tailwind-merge is what lets a caller
       pass `bg-transparent` and actually beat `t.surface`. Plain concatenation
       leaves both classes on the element and the winner is decided by
       stylesheet order, which is not something a caller can control. */
    <section id={id} className={cn("scroll-mt-16", t.surface, className)}>
      <div className={cn(WRAP, wrapClassName)}>
        <h2
          className={`text-[32px] font-semibold leading-tight tracking-[-0.015em] ${t.heading}`}
        >
          {title}
        </h2>
        <p className={`mt-3.5 max-w-[56ch] text-[17px] leading-relaxed ${t.muted}`}>
          {standfirst}
        </p>

        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_EMBARKO.map((pillar) => (
            <div key={pillar.id}>
              <h3 className={`text-[15px] font-semibold ${t.heading}`}>{pillar.title}</h3>
              <p className={`mt-2 text-[15px] leading-relaxed ${t.muted}`}>{pillar.body}</p>
            </div>
          ))}
        </div>
        {cta && <div className="mt-12">{cta}</div>}
      </div>
    </section>
  );
}

/**
 * The infrastructure-trust section. Four points, then the footnote that says
 * whose certificate it actually is.
 *
 * Was `EuropeanHosting`. Renamed with its data (trust.ts EU_HOSTING ->
 * INFRA_TRUST) when the EU location claim was found to be false.
 *
 * The footnote is not fine print we are hiding behind — it is the part that
 * makes the claim above it checkable, so it renders at the same size as the
 * body copy rather than shrunk into a disclaimer.
 */
export function InfrastructureTrust({
  tone = "gray",
  id = "european-hosting",
  className = "py-[88px] max-[720px]:py-[60px]",
  wrapClassName,
  cta,
}: {
  tone?: TrustTone;
  id?: string;
  /** Vertical rhythm. /v1 overrides this to make the section a full-height scene. */
  className?: string;
  /** See WhyEmbarko. */
  wrapClassName?: string;
  /** Opt-in call to action rendered below the section content. Landing
      variants pass their copy-prompt button; other pages leave it out. */
  cta?: React.ReactNode;
}) {
  const t = TONES[tone];

  return (
    <section id={id} className={cn("scroll-mt-16", t.inset, className)}>
      <div className={cn(WRAP, wrapClassName)}>
        <p className={`font-mono text-[11px] uppercase tracking-widest ${t.faint}`}>
          {INFRA_TRUST.eyebrow}
        </p>
        <h2
          className={`mt-4 text-[32px] font-semibold leading-tight tracking-[-0.015em] ${t.heading}`}
        >
          {INFRA_TRUST.title}
        </h2>
        <p className={`mt-3.5 max-w-[62ch] text-[17px] leading-relaxed ${t.muted}`}>
          {INFRA_TRUST.intro}
        </p>

        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {INFRA_TRUST.points.map((point) => {
            const Icon = TRUST_ICONS[point.id as keyof typeof TRUST_ICONS];
            return (
              <div key={point.id} className="flex gap-3.5">
                <Icon aria-hidden="true" className={`mt-0.5 size-[18px] shrink-0 ${t.icon}`} />
                <div>
                  <h3 className={`text-[15px] font-semibold ${t.heading}`}>{point.title}</h3>
                  <p className={`mt-1.5 text-[15px] leading-relaxed ${t.muted}`}>{point.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className={`mt-11 max-w-[68ch] border-t pt-6 text-[14px] leading-relaxed ${t.line} ${t.faint}`}>
          {INFRA_TRUST.footnote}
        </p>
        {cta && <div className="mt-12">{cta}</div>}
      </div>
    </section>
  );
}

/**
 * One-line version, for pages with no room for a section — currently /v2,
 * which is a sequence of full-screen beats rather than a scrolling page.
 */
export function TrustStrip({
  tone = "gray",
  className = "",
  onClick,
}: {
  tone?: TrustTone;
  className?: string;
  /** Makes the chip a button. /v2 passes this to open the detail dialog. */
  onClick?: () => void;
}) {
  const t = TONES[tone];
  const base = cn(
    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px]",
    t.badge,
    className,
  );

  if (!onClick) {
    return (
      <p className={base}>
        <ShieldCheck aria-hidden="true" className="size-3.5" />
        {INFRA_TRUST.strip}
      </p>
    );
  }

  /* A chip that opens something has to look like it does, or nobody finds the
     dialog behind it — hence the hover state and the trailing chevron. */
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, "transition hover:border-gray-400 hover:text-black")}
    >
      <ShieldCheck aria-hidden="true" className="size-3.5" />
      {INFRA_TRUST.strip}
      <ChevronRight aria-hidden="true" className="size-3.5 opacity-60" />
    </button>
  );
}
