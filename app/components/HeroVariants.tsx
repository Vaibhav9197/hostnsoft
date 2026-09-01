"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { trackHeroCTA } from "@/app/hooks/useHeroVariant";
import type { HeroVariant } from "@/app/lib/heroVariants";

/* Prompt copied to the clipboard by variant C's CTA. Kept as a constant so it
   can be reviewed and iterated without touching the component. */
const HERO_C_PROMPT =
  "Deploy this app to my Embarko workspace using the apphome-skill.md skill file. Set up hosting, a Postgres database, and team login, and give me a live URL.";

/* Icon components used only inside variant C */
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* Agent icons from public/agenticons, repeated to fill the strip */
const AGENT_ICONS = [
  'antigravity', 'claudecode', 'cline', 'codex', 'cursor', 'gemini',
  'githubcopilot', 'grokbot', 'hermes', 'lovable', 'openclaw', 'opencode',
  'perplexity', 'pi'
];
const AgentIcon = ({ name }: { name: string }) => (
  <img
    src={`/agenticons/agenticon-${name}.svg`}
    alt={name}
    aria-hidden="true"
    style={{ width: '32px', height: '32px' }}
  />
);

// Right section component (same for all variants)
interface HeroRightProps {
  toolGrid: ReactNode;
}

function HeroRight({ toolGrid }: HeroRightProps) {
  return (
    <div>
      <div className="ah-skill-panel">
        <p className="ah-cta-cap" data-reveal style={{ transitionDelay: "180ms" }}>Download the skill file for your favourite tool</p>
        {toolGrid}
        <p className="ah-hero-more" data-reveal style={{ transitionDelay: "240ms" }}>no AWS · no credit card to start · export anytime</p>
      </div>

      <div className="ah-hero-stats" data-reveal style={{ transitionDelay: "240ms" }}>
        <div className="ah-stat"><b>5 min</b><span>To first deploy</span></div>
        <div className="ah-stat"><b>8s</b><span>Postgres ready</span></div>
        <div className="ah-stat"><b>0</b><span>Servers to run</span></div>
      </div>
    </div>
  );
}

// Left section component (changes per variant)
interface HeroLeftProps {
  heading: string;
  subheading: string;
  cta: string;
  variant: HeroVariant;
  onCtaClick: () => void;
}

function HeroLeft({ heading, subheading, cta, variant, onCtaClick }: HeroLeftProps) {
  /* The href stays as a no-JS fallback that scrolls to the panel; with JS the
     dialog opens instead. */
  const handleCTAClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    trackHeroCTA(variant);
    onCtaClick();
  };

  return (
    <div>
      <div className="ah-hero-top">
        <h1 data-reveal style={{ transitionDelay: "65ms" }}>
          <span className="ah-hero-l1">
            <span>{heading.split(" / ")[0]}</span>
          </span>
          <span className="ah-hero-l2">{heading.split(" / ")[1] || ""}</span>
        </h1>
        <p className="ah-hero-sub" data-reveal style={{ transitionDelay: "130ms" }}>
          {subheading}
        </p>
        <a
          href="#cta"
          className="ah-btn ah-btn-primary"
          data-reveal
          onClick={handleCTAClick}
          style={{ transitionDelay: "195ms", marginTop: "1.5rem", display: "inline-flex" }}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}

interface HeroVariantProps {
  toolGrid: ReactNode;
  onCtaClick: () => void;
}

// Variant A: "Make the pain disappear"
export function HeroVariantA({ toolGrid, onCtaClick }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="A"
        onCtaClick={onCtaClick}
        heading="Hosting is the hard part. / We make it disappear."
        subheading="Build your app with AI. Give your AI the Embarko skill once, then just tell it to deploy. Your app goes live — with a real login, database, and URL — in 5 minutes."
        cta="Teach your AI to ship →"
      />
      <HeroRight toolGrid={toolGrid} />
    </div>
  );
}

// Variant B: "AI-native"
export function HeroVariantB({ toolGrid, onCtaClick }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="B"
        onCtaClick={onCtaClick}
        heading="Teach your AI to ship. / It learns once, deploys forever."
        subheading="Give your AI Embarko once. From then on, it can take your app from code to live without making you learn hosting, setup, or infrastructure."
        cta="Give your AI Embarko →"
      />
      <HeroRight toolGrid={toolGrid} />
    </div>
  );
}

/* Variant C: here.now-inspired layout.
   Full-width dark hero (styled at the section level via :has(.ah-hero-c)),
   headline + single copy-prompt CTA, agent logo strip, then a two-panel demo.
   Ignores toolGrid / onCtaClick — its CTA is a clipboard copy, not the
   skill-picker dialog. */
export function HeroVariantC(_props: HeroVariantProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const handleCopy = async () => {
    trackHeroCTA("C");

    let ok = false;
    try {
      await navigator.clipboard.writeText(HERO_C_PROMPT);
      ok = true;
    } catch {
      /* Clipboard API blocked (insecure origin, old Safari, unfocused window).
         Fall back to execCommand via a hidden textarea. */
      const holder = document.createElement("textarea");
      holder.value = HERO_C_PROMPT;
      holder.style.position = "fixed";
      holder.style.opacity = "0";
      document.body.appendChild(holder);
      holder.select();
      try { ok = document.execCommand("copy"); } catch { /* nothing more we can do */ }
      document.body.removeChild(holder);
    }

    if (!ok) return;
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="ah-hero-c">
      <div className="ah-hero-c-top">
        <h1 className="ah-hero-c-title">
          Instant hosting for every <span className="ah-hero-c-chip">app</span> you ship with your AI.
        </h1>
        <button
          type="button"
          className="ah-hero-c-cta"
          data-copied={copied || undefined}
          onClick={handleCopy}
          aria-live="polite"
        >
          {copied ? "Copied to clipboard" : "Copy prompt for agent"}
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      <div className="ah-hero-c-strip" aria-label="Supported AI agents">
        <div className="ah-hero-c-strip-cap">Works with every agent</div>
        <div className="ah-hero-c-logos-wrap">
          <div className="ah-hero-c-logos">
            {/* Render all 14 agent icons, repeated to fill wider viewports */}
            {[...AGENT_ICONS, ...AGENT_ICONS.slice(0, 4)].map((name, i) => (
              <AgentIcon key={`${name}-${i}`} name={name} />
            ))}
          </div>
        </div>
      </div>

      <div className="ah-hero-c-divider" aria-hidden="true">
        <span className="ah-hero-c-divider-mark">◐</span>
      </div>

      <div className="ah-hero-c-demo">
        <div>
          <h3 className="ah-hero-c-demo-title">
            Tell your agent to<br />deploy to Embarko
          </h3>
          <div className="ah-hero-c-panel">
            <div className="ah-hero-c-panel-h">
              <span className="ah-hero-c-dot" />
              <span className="ah-hero-c-dot" />
              <span className="ah-hero-c-dot" />
            </div>
            <div className="ah-hero-c-panel-b">
              <div className="prompt">deploy this app to embarko</div>
              <div className="ok">Provisioned in 3.8s</div>
              <div className="url">https://your-app.embarko.dev</div>
            </div>
          </div>
        </div>

        <div className="ah-hero-c-demo-arrow" aria-hidden="true">→</div>

        <div>
          <h3 className="ah-hero-c-demo-title">
            It&apos;s live at<br /><code>your-app.embarko.dev</code>
          </h3>
          <div className="ah-hero-c-panel">
            <div className="ah-hero-c-panel-h">
              <span className="ah-hero-c-dot" />
              <span className="ah-hero-c-dot" />
              <span className="ah-hero-c-dot" />
              <span className="ah-hero-c-panel-tab">your-app.embarko.dev</span>
            </div>
            <div className="ah-hero-c-preview">
              <div>
                <div className="ah-hero-c-preview-logo">E</div>
                <div className="ah-hero-c-preview-lines">
                  <span /><span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variant D: "The magic"
export function HeroVariantD({ toolGrid, onCtaClick }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="D"
        onCtaClick={onCtaClick}
        heading="Your AI built the app. / Now let it launch it."
        subheading="Give your AI Embarko once. Say 'deploy it' whenever you're ready. Your app goes live, without the hosting rabbit hole."
        cta="Deploy my app →"
      />
      <HeroRight toolGrid={toolGrid} />
    </div>
  );
}

// Main component that renders based on variant prop
interface HeroSectionProps {
  variant: HeroVariant;
  toolGrid: ReactNode;
  onCtaClick: () => void;
}

export function HeroSection({ variant, toolGrid, onCtaClick }: HeroSectionProps) {
  const variants = {
    A: <HeroVariantA toolGrid={toolGrid} onCtaClick={onCtaClick} />,
    B: <HeroVariantB toolGrid={toolGrid} onCtaClick={onCtaClick} />,
    C: <HeroVariantC toolGrid={toolGrid} onCtaClick={onCtaClick} />,
    D: <HeroVariantD toolGrid={toolGrid} onCtaClick={onCtaClick} />,
  };

  return (
    <section className="ah-hero">
      <div className="ah-hero-bg" aria-hidden="true" />
      <div className="ah-hero-glow" aria-hidden="true" />
      <div className="ah-wrap">
        {variants[variant]}
      </div>
    </section>
  );
}
