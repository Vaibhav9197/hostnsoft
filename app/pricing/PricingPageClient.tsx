"use client";

import { useMemo, useState } from "react";
import { Check, Info, Lightbulb, Cpu, Zap } from "lucide-react";
import { Card, CtaSection, GlowBackdrop, Hero, Pill, PrimaryCta, Section, SectionHeading, Serif, buttonClass } from "@/app/components/ds";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Header } from "../components/Header";
import { SiteFooter } from "../components/SiteFooter";
import { LoginModal } from "../components/LoginModal";
import { cn } from "../lib/utils";
import { agentIconSrc } from "../lib/agents";
import { formatMoney } from "../lib/format";
import { monthlyCents, planDetails as sharedPlanDetails, planFamily, rememberPlanAfterLogin, type PlanDetails } from "../lib/plans";
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
  /* Where sign-in lands: the apps list, or — from a paid plan's button —
     billing with that plan picked, so the choice isn't lost on the way. */
  const [loginTarget, setLoginTarget] = useState("/app");
  const openLogin = (target = "/app") => {
    setLoginTarget(target);
    setLoginOpen(true);
  };

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
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <Header onAuthClick={() => openLogin()} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} redirectPath={loginTarget} />

      <div className="ds-wrap">
        <div className="relative isolate">
          <GlowBackdrop position="top" />
          <Hero
            className="ds-hero-sm"
            eyebrow="Pricing"
            title={
              <>
                You build it.
                <br />
                Embarko makes it <Serif grad>real</Serif>.
              </>
            }
            sub="Build apps with AI. Tell your AI to deploy to Embarko, and we'll take care of the rest."
            /* Above the fold on every screen: the plans start below it, and
               the free plan needs nothing but the prompt. */
            actions={<PrimaryCta />}
          />
        </div>

        {/* Pricing Cards */}
        {/* Clipped sideways: the highlighted card's glow reaches past the
            screen edge on phones and would scroll the page. */}
        <section aria-labelledby="plans-h" className="relative overflow-x-clip">
          <SectionHeading id="plans-h" kicker="01 — Plans" title="Choose your plan" center />

          {hasBothIntervals && (
            <div className="mb-10 flex justify-center">
              <div
                role="radiogroup"
                aria-label="Billing period"
                className="inline-flex items-center gap-1 rounded-[var(--ds-r-pill)] border border-[var(--ds-line)] bg-[var(--ds-card)] p-1 text-sm"
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
                        "min-h-[40px] rounded-[var(--ds-r-pill)] px-5 font-semibold transition-colors motion-reduce:transition-none",
                        on ? "bg-[var(--ds-ink)] text-[var(--bg)]" : "text-[var(--ds-mute)] hover:text-[var(--ds-ink)]",
                      )}
                    >
                      {iv === "monthly" ? "Monthly" : "Yearly"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {shownPlans.map((plan) => {
              const details = planDetails(plan);
              const twin = plan.interval === "yearly" ? monthlyTwin(plan) : null;
              const saving = twin ? Math.round((1 - monthlyCents(plan) / monthlyCents(twin)) * 100) : 0;
              const hi = !!details.highlighted;

              return (
                <div key={plan.code} className={cn("relative isolate min-w-0", hi && "md:-my-3")}>
                  {hi && (
                    <div
                      aria-hidden="true"
                      className="absolute -inset-[1.5px] -z-10 rounded-[calc(var(--ds-r)+1.5px)] bg-[image:var(--ds-grad)] opacity-90 blur-[0.5px]"
                    />
                  )}
                  {hi && (
                    <div
                      aria-hidden="true"
                      className="absolute -inset-6 -z-20 rounded-[var(--ds-r-lg)] bg-[image:var(--ds-grad)] opacity-[calc(var(--ds-glow-opacity,0.5)*0.35)] blur-3xl"
                    />
                  )}
                  <Card className={cn("flex h-full flex-col p-7 md:p-8", hi && "shadow-[var(--ds-sh2)]")}>
                    {details.badge && (
                      <div className="mb-4">
                        <Pill grad={hi}>{details.badge}</Pill>
                      </div>
                    )}

                    <div className="mb-7">
                      <h3 className="mb-2 text-2xl font-bold tracking-[-0.02em] text-[var(--ds-ink)]">{plan.name}</h3>
                      <p className="mb-5 text-sm leading-relaxed text-[var(--ds-mute)]">{details.headline}</p>

                      {plan.interval === "yearly" ? (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-extrabold tracking-[-0.04em] text-[var(--ds-ink)]">
                              {formatMoney(Math.round(monthlyCents(plan)), plan.amount_currency)}
                            </span>
                            <span className="text-[var(--ds-mute)]">/month</span>
                          </div>
                          <div className="mt-1.5 text-sm text-[var(--ds-mute)]">
                            Billed {formatMoney(plan.amount_cents, plan.amount_currency)} yearly
                            {saving > 0 && <span className="ml-1.5 font-semibold text-success">· Save {saving}%</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-extrabold tracking-[-0.04em] text-[var(--ds-ink)]">
                            {formatMoney(plan.amount_cents, plan.amount_currency)}
                          </span>
                          <span className="text-[var(--ds-mute)]">/month</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (plan.amount_cents === 0) return openLogin("/app");
                        rememberPlanAfterLogin(plan.code);
                        openLogin("/app/billing");
                      }}
                      className={buttonClass(hi ? "glow" : "secondary", "lg", "mb-7 w-full")}
                    >
                      {details.cta}
                    </button>

                    <ul className="flex-1 space-y-3 border-t border-[var(--ds-line)] pt-6">
                      {details.features.map((feature) => {
                        const text = typeof feature === "string" ? feature : feature.text;
                        const tooltip = typeof feature === "string" ? undefined : feature.tooltip;
                        return (
                          <li key={text} className="flex items-start gap-3">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--ds-v1)]" aria-hidden="true" />
                            <span className="min-w-0 text-sm text-[var(--ds-ink)]">{text}</span>
                            {tooltip && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger aria-label={tooltip}>
                                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--ds-dim)]" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">{tooltip}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <Section labelledBy="how-h">
          <SectionHeading id="how-h" kicker="02 — How it works" title="Idea to live app." center />
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { n: "Step 1", icon: Lightbulb, title: "Your idea", body: "Tell your AI exactly what app you want to build. Any idea, any size." },
              { n: "Step 2", icon: Cpu, title: "AI builds it", body: "Your AI writes all the code. Claude, Cursor, Bolt — any tool works." },
              { n: "Step 3", icon: Zap, title: "Embarko makes it real", body: "Deploy to Embarko. Your app goes live with a real URL, database, and login." },
            ].map(({ n, icon: Icon, title, body }) => (
              <Card as="li" key={n} className="min-w-0 p-7">
                <span className="ds-kicker">{n}</span>
                <div className="mb-5 inline-flex rounded-2xl border border-[var(--ds-line)] bg-[var(--ds-soft)] p-3">
                  <Icon className="h-6 w-6 text-[var(--ds-v1)]" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--ds-ink)]">{title}</h3>
                <p className="text-sm leading-relaxed text-[var(--ds-mute)]">{body}</p>
              </Card>
            ))}
          </ol>
        </Section>

        {/* AI Compatibility Section */}
        <Section labelledBy="compat-h" wrap={false}>
          <SectionHeading
            id="compat-h"
            kicker="03 — Compatible with"
            title="Built with any AI tool."
            sub={
              <>
                Claude Code, Cursor, Bolt, Lovable, v0, Replit, GPT, or even Codex — if an AI tool built it, Embarko can host it.
                <br />
                Deploy the same way from any editor. No special setup. No vendor lock-in.
              </>
            }
            center
          />

          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* `icon` names a mark in public/agenticons; GPT and Codex share
                OpenAI's, which is the mark both ship under. */}
            {[
              { name: "Claude Code", detail: "Skill file", icon: "claudecode" },
              { name: "Cursor", detail: "Rules file", icon: "cursor" },
              { name: "Bolt", detail: "Export & deploy", icon: "bolt" },
              { name: "Lovable", detail: "One-click", icon: "lovable" },
              { name: "Replit", detail: "Direct deploy", icon: "replit" },
              { name: "v0", detail: "Export & deploy", icon: "v0" },
              { name: "GPT", detail: "Export code", icon: "codex" },
              { name: "Codex", detail: "Export code", icon: "codex" },
            ].map((tool) => (
              <Card as="li" key={tool.name} className="min-w-0 p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  {/* Decorative: the tool's name is right beside it. */}
                  <img src={agentIconSrc(tool.icon)} alt="" aria-hidden="true" className="size-4 shrink-0" />
                  <div className="min-w-0 text-sm font-semibold text-[var(--ds-ink)] [overflow-wrap:anywhere]">{tool.name}</div>
                </div>
                <div className="text-xs text-[var(--ds-mute)]">{tool.detail}</div>
              </Card>
            ))}
          </ul>

          {/* The reader has just found their own tool in the grid; the prompt
              is the next thing they need, not a scroll further down. */}
          <div className="ds-ctas mt-10">
            <PrimaryCta glow={false} size="md" />
          </div>
          <p className="mt-4 text-center text-sm text-[var(--ds-mute)]">Paste it into your AI agent and ask it to deploy.</p>
        </Section>

        {/* The next step is the agent's, not a signup form: nobody creates an
            Embarko app by hand, so the closing CTA hands over the prompt. */}
        <CtaSection
          id="next"
          title={
            <>
              Your next idea
              <br />
              could be <Serif>live</Serif> today.
            </>
          }
          line="Build it with AI. Ship it with Embarko."
        />
      </div>

      <SiteFooter />
    </main>
  );
}
