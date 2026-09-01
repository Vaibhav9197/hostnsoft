"use client";

import { ReactNode } from "react";
import { trackHeroCTA } from "@/app/hooks/useHeroVariant";
import type { HeroVariant } from "@/app/lib/heroVariants";

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
  variant: 'A' | 'B' | 'C' | 'D';
}

function HeroLeft({ heading, subheading, cta, variant }: HeroLeftProps) {
  const handleCTAClick = () => {
    trackHeroCTA(variant);
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
}

// Variant A: "Make the pain disappear"
export function HeroVariantA({ toolGrid }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="A"
        heading="Hosting is the hard part. / We make it disappear."
        subheading="Build your app with AI. Give your AI the Embarko skill once, then just tell it to deploy. Your app goes live — with a real login, database, and URL — in 5 minutes."
        cta="Teach your AI to ship →"
      />
      <HeroRight toolGrid={toolGrid} />
    </div>
  );
}

// Variant B: "AI-native"
export function HeroVariantB({ toolGrid }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="B"
        heading="Teach your AI to ship. / It learns once, deploys forever."
        subheading="Give your AI Embarko once. From then on, it can take your app from code to live without making you learn hosting, setup, or infrastructure."
        cta="Give your AI Embarko →"
      />
      <HeroRight toolGrid={toolGrid} />
    </div>
  );
}

// Variant C: "Strongest emotional angle"
export function HeroVariantC({ toolGrid }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="C"
        heading="Don't become a hosting engineer. / You already built the hard part."
        subheading="AI can build your app in hours. You shouldn't have to spend another day figuring out how to get it online. Tell your AI to deploy to Embarko. Get a live app. That's it."
        cta="Build with AI. Ship with Embarko →"
      />
      <HeroRight toolGrid={toolGrid} />
    </div>
  );
}

// Variant D: "The magic"
export function HeroVariantD({ toolGrid }: HeroVariantProps) {
  return (
    <div className="ah-hero-grid">
      <HeroLeft
        variant="D"
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
  variant: 'A' | 'B' | 'C' | 'D';
  toolGrid: ReactNode;
}

export function HeroSection({ variant, toolGrid }: HeroSectionProps) {
  const variants = {
    A: <HeroVariantA toolGrid={toolGrid} />,
    B: <HeroVariantB toolGrid={toolGrid} />,
    C: <HeroVariantC toolGrid={toolGrid} />,
    D: <HeroVariantD toolGrid={toolGrid} />,
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
