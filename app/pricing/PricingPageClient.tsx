"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Info, Lightbulb, Cpu, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Header } from "../components/Header";
import { SiteFooter } from "../components/SiteFooter";
import { LoginModal } from "../components/LoginModal";
import { cn } from "../lib/utils";
import { formatMoney } from "../lib/format";
import { monthlyCents, planDetails as sharedPlanDetails, planFamily, type PlanDetails } from "../lib/plans";
import type { BillingPlan } from "../lib/types";

type Interval = "monthly" | "yearly";

// A plan outside the known tiers still renders, with Lago's description.
const planDetails = (plan: BillingPlan): PlanDetails =>
  sharedPlanDetails(plan) ?? { headline: plan.description ?? "", features: [], cta: "Choose plan" };

// Fallback shown only if the public plans read fails or returns nothing —
// so the page never renders empty while the API catalogue is unreachable.
const FALLBACK_PLANS: BillingPlan[] = [
  { lago_id: "fallback_free", name: "Free", code: "embarko_free", interval: "monthly", amount_cents: 0, amount_currency: "USD" },
  { lago_id: "fallback_creator", name: "Creator", code: "embarko_creator", interval: "monthly", amount_cents: 1500, amount_currency: "USD" },
  { lago_id: "fallback_creator_annual", name: "Creator", code: "embarko_creator_annual", interval: "yearly", amount_cents: 10800, amount_currency: "USD" },
  { lago_id: "fallback_team", name: "Team", code: "embarko_team", interval: "monthly", amount_cents: 3900, amount_currency: "USD" },
  { lago_id: "fallback_team_annual", name: "Team", code: "embarko_team_annual", interval: "yearly", amount_cents: 27600, amount_currency: "USD" },
];

export function PricingPageClient({ plans: fetched }: { plans: BillingPlan[] }) {
  const [loginOpen, setLoginOpen] = useState(false);

  const plans = fetched.length > 0 ? fetched : FALLBACK_PLANS;

  const hasMonthly = plans.some((p) => p.interval === "monthly" && p.amount_cents > 0);
  const hasYearly = plans.some((p) => p.interval === "yearly");
  const hasBothIntervals = hasMonthly && hasYearly;

  const [interval, setInterval] = useState<Interval | null>(null);
  const shownInterval: Interval = hasBothIntervals ? interval ?? "yearly" : hasYearly ? "yearly" : "monthly";

  const shownPlans = useMemo(
    () =>
      plans
        .filter((p) => p.amount_cents === 0 || p.interval === shownInterval)
        .sort((a, b) => monthlyCents(a) - monthlyCents(b)),
    [plans, shownInterval],
  );

  const monthlyTwin = (plan: BillingPlan) =>
    plans.find((p) => p.interval === "monthly" && p.code !== plan.code && planFamily(p) === planFamily(plan)) ?? null;

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

            {hasBothIntervals && (
              <div className="flex justify-center mb-10">
                <div
                  role="radiogroup"
                  aria-label="Billing period"
                  className="inline-flex items-center rounded-full border border-border bg-card p-1 text-sm"
                >
                  {(["monthly", "yearly"] as Interval[]).map((iv) => {
                    const on = shownInterval === iv;
                    return (
                      <button
                        key={iv}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setInterval(iv)}
                        className={cn(
                          "rounded-full px-4 py-1.5 font-semibold transition-colors",
                          on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {iv === "monthly" ? "Monthly" : "Yearly"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {shownPlans.map((plan) => {
                const details = planDetails(plan);
                const twin = plan.interval === "yearly" ? monthlyTwin(plan) : null;
                const saving = twin ? Math.round((1 - monthlyCents(plan) / monthlyCents(twin)) * 100) : 0;

                return (
                  <div
                    key={plan.code}
                    className={cn(
                      "flex flex-col p-8 border transition-all duration-200",
                      details.highlighted ? "border-primary bg-card shadow-md md:scale-105" : "border-border bg-card",
                    )}
                  >
                    {details.badge && (
                      <div className="mb-4 inline-block">
                        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-primary">
                          {details.badge}
                        </span>
                      </div>
                    )}

                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{details.headline}</p>

                      {plan.interval === "yearly" ? (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-bold text-foreground">
                              {formatMoney(Math.round(monthlyCents(plan)), plan.amount_currency)}
                            </span>
                            <span className="text-muted-foreground">/month</span>
                          </div>
                          <div className="mt-1.5 text-sm text-muted-foreground">
                            Billed {formatMoney(plan.amount_cents, plan.amount_currency)} yearly
                            {saving > 0 && <span className="ml-1.5 font-semibold text-success">· Save {saving}%</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-bold text-foreground">
                            {formatMoney(plan.amount_cents, plan.amount_currency)}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => setLoginOpen(true)}
                      className={cn(
                        "w-full mb-8 h-11 font-semibold",
                        details.highlighted ? "bg-blue-600 text-white hover:bg-blue-700" : "border-border hover:bg-elevated",
                      )}
                      variant={details.highlighted ? "default" : "outline"}
                    >
                      {details.cta}
                    </Button>

                    <div className="space-y-3 flex-1">
                      {details.features.map((feature) => {
                        const text = typeof feature === "string" ? feature : feature.text;
                        const tooltip = typeof feature === "string" ? undefined : feature.tooltip;
                        return (
                          <div key={text} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{text}</span>
                            {tooltip && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger aria-label={tooltip}>
                                    <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">{tooltip}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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

      <SiteFooter />
    </div>
  );
}
