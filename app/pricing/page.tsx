"use client";

import { useState } from "react";
import { Check, ArrowRight, Lightbulb, Cpu, Zap, Code2, Lock, Share2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Header } from "../components/Header";
import { LoginModal } from "../components/LoginModal";

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      {children}
    </svg>
  );
}

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      headline: "Make your first app real.",
      features: [
        "1 live app",
        "Your own Embarko link",
        "Share your app with anyone",
        "Your app just works",
        "Automatic updates",
        "Safe and secure",
        "Embarko branding",
      ],
      cta: "Start for free",
      highlighted: false,
    },
    {
      name: "Creator",
      price: "$15",
      period: "/month",
      headline: "For people who can't stop building.",
      features: [
        "Up to 5 live apps",
        "Use your own domain",
        "Remove Embarko branding",
        "Automatic backups",
        "More usage",
        "Faster performance",
        "Everything taken care of automatically",
      ],
      cta: "Start building",
      badge: "Most popular",
      highlighted: true,
    },
    {
      name: "Pro",
      price: "$39",
      period: "/month",
      headline: "For serious builders.",
      features: [
        "Up to 20 live apps",
        "Much more usage",
        "Advanced controls",
        "Team access",
        "Multiple versions of your apps",
        "Priority support",
      ],
      cta: "Go Pro",
      highlighted: false,
    },
  ];

  const aiTools = ["Claude", "Cursor", "Bolt", "Lovable", "Replit", "GPT", "v0", "Codex"];

  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        // Scoped black-and-white override: the shared Tailwind color utilities
        // (bg-primary, text-primary, bg-elevated, border-border, ...) all read
        // these CSS custom properties, so overriding them here restyles the
        // pricing page to grayscale without touching the shared theme used by
        // the rest of the app (app/base.css :root).
        "--bg": "#ffffff",
        "--surface": "#ffffff",
        "--surface-2": "#f2f2f2",
        "--surface-3": "#e5e5e5",
        "--ink": "#111111",
        "--ink-soft": "#555555",
        "--ink-faint": "#8a8a8a",
        "--accent": "#111111",
        "--accent-2": "#000000",
        "--accent-soft": "rgba(17,17,17,.08)",
        "--accent-line": "rgba(17,17,17,.28)",
        "--on-accent": "#ffffff",
        "--line": "#e5e5e5",
        "--line-strong": "#cccccc",
      } as React.CSSProperties}
    >
      <Header onAuthClick={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 px-6">
        <div className="mx-auto max-w-[74rem]">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              You build it<br />
              <span className="text-primary">Embarko makes it real</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Build apps with AI. Tell your AI to deploy to Embarko, and we'll take care of the rest.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="mb-24">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">Choose your plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col p-8 border transition-all duration-200 ${
                  plan.highlighted
                    ? "border-primary bg-card shadow-md md:scale-105"
                    : "border-border bg-card"
                }`}
              >
                {plan.badge && (
                  <div className="mb-4 inline-block">
                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-primary">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-3xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {plan.headline}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setLoginOpen(true)}
                  className={`w-full mb-8 h-11 font-semibold ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border-border hover:bg-elevated"
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>

                <div className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Enhanced flow visualization with step numbers */}
          <div className="mt-16 mb-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {/* Step 1: Idea */}
              <div className="group flex flex-col items-start md:items-center">
                <div className="mb-3 inline-flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 1</span>
                  <span className="text-primary">•</span>
                </div>
                <div className="mb-6 p-5 bg-primary/8 border border-primary/25 group-hover:border-primary group-hover:bg-primary/12 transition-all duration-300">
                  <Lightbulb className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 md:text-center">Your idea</h3>
                <p className="text-sm text-muted-foreground md:text-center leading-relaxed">
                  Tell your AI exactly what app you want to build. Any idea, any size.
                </p>
              </div>

              {/* Step 2: AI Builds */}
              <div className="group flex flex-col items-start md:items-center">
                <div className="mb-3 inline-flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 2</span>
                  <span className="text-primary">•</span>
                </div>
                <div className="mb-6 p-5 bg-primary/8 border border-primary/25 group-hover:border-primary group-hover:bg-primary/12 transition-all duration-300">
                  <Cpu className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 md:text-center">AI builds it</h3>
                <p className="text-sm text-muted-foreground md:text-center leading-relaxed">
                  Your AI writes all the code. Claude, Cursor, Bolt — any tool works.
                </p>
              </div>

              {/* Step 3: Goes Live */}
              <div className="group flex flex-col items-start md:items-center">
                <div className="mb-3 inline-flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 3</span>
                  <span className="text-primary">•</span>
                </div>
                <div className="mb-6 p-5 bg-primary/8 border border-primary/25 group-hover:border-primary group-hover:bg-primary/12 transition-all duration-300">
                  <Zap className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 md:text-center">Embarko makes it real</h3>
                <p className="text-sm text-muted-foreground md:text-center leading-relaxed">
                  Deploy to Embarko. Your app goes live with a real URL, database, and login.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* AI Compatibility Section */}
      <section className="px-6 py-16 bg-elevated">
        <div className="mx-auto max-w-[74rem]">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Compatible with</span>
              <span className="text-primary/40">•</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Built with any AI tool.
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-2 leading-relaxed">
              Claude Code, Cursor, Bolt, Lovable, v0, Replit, GPT, or even Codex — if an AI tool built it, Embarko can host it.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">Deploy the same way from any editor. No special setup. No vendor lock-in.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Claude Code", detail: "Skill file" },
              { name: "Cursor", detail: "Rules file" },
              { name: "Bolt", detail: "Export & deploy" },
              { name: "Lovable", detail: "One-click" },
              { name: "Replit", detail: "Direct deploy" },
              { name: "v0", detail: "Export & deploy" },
              { name: "GPT", detail: "Export code" },
              { name: "Codex", detail: "Export code" },
            ].map((tool) => (
              <div key={tool.name} className="p-4 border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
                <div className="text-sm font-semibold text-foreground mb-1">{tool.name}</div>
                <div className="text-xs text-muted-foreground">{tool.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-24 border-t border-border">
        <div className="mx-auto max-w-[74rem] text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Your next idea<br />
            could be live today.
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
            Build it with AI. Ship it with Embarko.
          </p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 px-8 h-12 text-base font-semibold"
          >
            Start for free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
