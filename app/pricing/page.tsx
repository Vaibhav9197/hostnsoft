"use client";

import Link from "next/link";
import { Check, ArrowRight, Lightbulb, Cpu, Zap } from "lucide-react";
import { Button } from "../components/ui/button";

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 h-[62px] border-b border-transparent bg-background/78 backdrop-blur-lg">
        <div className="mx-auto max-w-[74rem] px-6 h-full flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-lg text-foreground">
            <span className="w-2 h-2 bg-primary"></span>
            Embarko
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 px-6">
        <div className="mx-auto max-w-[74rem]">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              You build it.<br />
              <span className="text-primary">Embarko makes it real.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Build apps with AI. Tell your AI to deploy to Embarko, and we'll take care of the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-primary text-white hover:bg-[color:var(--accent-2)] px-8 h-12 text-base font-semibold">
                Start for free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" className="px-8 h-12 text-base font-semibold border-border">
                See how it works
              </Button>
            </div>
          </div>

          {/* Beautiful flow visualization */}
          <div className="mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Step 1: Idea */}
              <div className="group flex flex-col items-center">
                <div className="mb-4 p-4 bg-primary/10 rounded-none border border-primary/20 group-hover:border-primary group-hover:bg-primary/15 transition-all duration-300">
                  <Lightbulb className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Your idea</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Describe what you want to build
                </p>
              </div>

              {/* Step 2: AI Builds */}
              <div className="group flex flex-col items-center">
                <div className="mb-4 p-4 bg-primary/10 rounded-none border border-primary/20 group-hover:border-primary group-hover:bg-primary/15 transition-all duration-300">
                  <Cpu className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI builds it</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Your AI writes the code
                </p>
              </div>

              {/* Step 3: Goes Live */}
              <div className="group flex flex-col items-center">
                <div className="mb-4 p-4 bg-primary/10 rounded-none border border-primary/20 group-hover:border-primary group-hover:bg-primary/15 transition-all duration-300">
                  <Zap className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Embarko makes it real</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Your app is live instantly
                </p>
              </div>
            </div>

            {/* Mobile connectors */}
            <div className="md:hidden flex justify-center gap-2 mt-6">
              <div className="flex-1 h-0.5 bg-primary/20"></div>
              <span className="text-primary/40">→</span>
              <div className="flex-1 h-0.5 bg-primary/20"></div>
              <span className="text-primary/40">→</span>
              <div className="flex-1 h-0.5 bg-primary/20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[74rem]">
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
                  className={`w-full mb-8 h-11 font-semibold ${
                    plan.highlighted
                      ? "bg-primary text-white hover:bg-[color:var(--accent-2)]"
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
      </section>

      {/* Philosophy Section */}
      <section className="px-6 py-20 bg-elevated">
        <div className="mx-auto max-w-[74rem]">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              You don't need to know how it works.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Just tell your AI what you want to build. When you're ready, tell it to deploy to Embarko. Your app goes live and we take care of everything behind the scenes.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Step 1</div>
              <div className="text-lg text-foreground font-medium">Your idea</div>
            </div>
            <div className="hidden md:flex items-center justify-center text-2xl text-primary">→</div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Step 2</div>
              <div className="text-lg text-foreground font-medium">AI builds it</div>
            </div>
            <div className="hidden md:flex items-center justify-center text-2xl text-primary">→</div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Step 3</div>
              <div className="text-lg text-foreground font-medium">Embarko makes it real</div>
            </div>
            <div className="hidden md:flex items-center justify-center text-2xl text-primary">→</div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Step 4</div>
              <div className="text-lg text-foreground font-medium">People use your app</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Compatibility Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[74rem]">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Built with AI?<br />
              <span className="text-primary">It can live on Embarko.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Whatever AI you build with, Embarko can be where your app lives.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {aiTools.map((tool) => (
                <div key={tool} className="px-6 py-4 border border-border bg-card">
                  <div className="text-sm font-medium text-foreground">{tool}</div>
                </div>
              ))}
            </div>
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
          <Button className="bg-primary text-white hover:bg-[color:var(--accent-2)] px-8 h-12 text-base font-semibold">
            Start for free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
