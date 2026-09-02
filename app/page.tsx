"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Check, Users, Database, Layers, Plus, Lock, Bot, Globe } from "lucide-react";
import { LoginModal } from "./components/LoginModal";
import { Header } from "./components/Header";
import { DEPLOY_PROMPT } from "./lib/deployPrompt";

/* Looping "watch it deploy" timeline for the three-step process below the
   hero CTA. A single elapsed-ms counter drives every derived phase, rather
   than nested timers, so the whole sequence stays deterministic and easy to
   re-time. Disabled under prefers-reduced-motion — see the effect below. */
const CYCLE_MS = 7000;
const STEP2_START = 1400;
const LIVE_COUNT_START = 3900;
const STEP3_START = 4300;
const STEP3_TYPE_MS = 1000;
const SITE_URL = "your-app.embarko.ai";
const LOGS = [
  { t: 1400, text: "> deploy this app to embarko" },
  { t: 2100, text: "Installing dependencies..." },
  { t: 2800, text: "Building..." },
  { t: 3500, text: "Provisioning database..." },
];

const TABS = [
  { id: "login", label: "Team login", icon: Users },
  { id: "database", label: "Database", icon: Database },
  { id: "workspace", label: "Workspace", icon: Layers },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ACCESS_OPTIONS = [
  { id: "anyone", label: "Anyone with link" },
  { id: "password", label: "Password" },
  { id: "restricted", label: "Restricted", note: "invite-only" },
] as const;

type AccessId = (typeof ACCESS_OPTIONS)[number]["id"];

const FAQ = [
  {
    q: "How is this different from Vercel or Netlify?",
    a: "They host code. We host teams — logins, roles, and a database come standard, not bolted on afterward.",
  },
  {
    q: "What AI tools does this work with?",
    a: "Claude Code, Cursor, Lovable, v0, Bolt, Replit, or a plain ZIP — if an AI built it, we can host it.",
  },
  {
    q: "Do I need to already have a database or auth set up?",
    a: "No. We provision both automatically. Bring your own auth instead if you'd rather — it's optional.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Point a CNAME at your workspace and we handle HTTPS for you.",
  },
];

export default function Page() {
  const [copied, setCopied] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("login");
  const [access, setAccess] = useState<AccessId>("restricted");
  const [elapsed, setElapsed] = useState(STEP3_START + 100);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setElapsed((e) => (e + 100) % CYCLE_MS);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const step2Active = elapsed >= STEP2_START && elapsed < STEP3_START;
  const step3Active = elapsed >= STEP3_START;
  const step1Active = !step2Active && !step3Active;

  /* The final log line counts up live ("Live in 0.0s" -> "4.1s") instead of
     appearing as static text, timed to land exactly as step 3 takes over. */
  const visibleLogs = LOGS.filter((l) => elapsed >= l.t && elapsed < STEP3_START);
  const liveCounterActive = elapsed >= LIVE_COUNT_START && elapsed < STEP3_START;
  const liveSeconds = (
    (Math.min(elapsed, STEP3_START) - LIVE_COUNT_START) / (STEP3_START - LIVE_COUNT_START) * 4.1
  ).toFixed(1);
  const displayLines = liveCounterActive
    ? [...visibleLogs, { t: LIVE_COUNT_START, text: `Live in ${liveSeconds}s` }]
    : visibleLogs;

  /* Step 3's URL types in character by character once it takes over, and the
     "it's live" line only appears once typing finishes — the reveal is the
     payoff, not an instant swap. */
  const typeProgress = step3Active ? Math.min(1, (elapsed - STEP3_START) / STEP3_TYPE_MS) : 0;
  const typedUrl = SITE_URL.slice(0, Math.round(typeProgress * SITE_URL.length));
  const urlTypingDone = typeProgress >= 1;
  const liveLineVisible = step3Active && urlTypingDone;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(DEPLOY_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — nothing more we can do.
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <Header onAuthClick={() => setLoginOpen(true)} />

      <main>
        {/* ===== Hero ===== */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="motion-safe:animate-fade-up text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              You build it
              <br />
              Embarko makes it{" "}
              <span className="inline-block rounded-lg bg-neutral-100 px-2 py-0.5">real</span>
            </h1>

            <div
              className="motion-safe:animate-fade-up mt-10 flex flex-col items-center gap-3 [animation-delay:120ms]"
            >
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 active:translate-y-px"
              >
                {copied ? "Paste in your agent" : "Copy prompt for agent"}
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <span className="text-xs text-neutral-400">no AWS · no credit card to start</span>
            </div>
          </div>

          {/* Three-step process — auto-plays a "watch it deploy" loop */}
          <div className="motion-safe:animate-fade-up mx-auto mt-20 grid max-w-5xl grid-cols-1 items-stretch gap-4 [animation-delay:240ms] md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {/* Step 1 — Copy prompt */}
            <div
              className={`flex flex-col overflow-hidden rounded-xl border transition-colors duration-300 ${
                step1Active ? "border-neutral-950" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-1.5 border-b border-neutral-200 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 truncate rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
                  embarko.ai
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className={`text-xs font-semibold transition-colors duration-300 ${step1Active ? "text-neutral-950" : "text-neutral-400"}`}>
                  01
                </span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <Copy className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-sm font-semibold">Copy the prompt</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  One click on the button above.
                </p>
              </div>
            </div>

            <ArrowRight className={`mx-auto hidden h-5 w-5 self-center transition-colors duration-300 md:block ${step2Active || step3Active ? "text-neutral-950" : "text-neutral-300"}`} />
            <ArrowRight className={`mx-auto h-5 w-5 rotate-90 transition-colors duration-300 md:hidden ${step2Active || step3Active ? "text-neutral-950" : "text-neutral-300"}`} />

            {/* Step 2 — Give it to your agent */}
            <div
              className={`flex flex-col overflow-hidden rounded-xl bg-neutral-900 shadow-sm ring-2 transition-[box-shadow] duration-300 ${
                step2Active ? "ring-white" : "ring-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="text-xs font-semibold text-neutral-500">02</span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Bot className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">Give it to your agent</h3>
                <div className="mt-1 h-11 space-y-1 overflow-hidden font-mono text-xs leading-relaxed">
                  {displayLines.length === 0 ? (
                    <p className="text-neutral-500">
                      <span className="text-neutral-600">{">"}</span> waiting for prompt...
                    </p>
                  ) : (
                    displayLines.slice(-2).map((log, i, arr) => (
                      <p
                        key={log.text}
                        className={`motion-safe:animate-fade-up tabular-nums ${
                          i === arr.length - 1 ? "font-semibold text-white" : "text-neutral-500"
                        }`}
                      >
                        {log.text.startsWith(">") ? (
                          <>
                            <span className="text-neutral-500">{">"}</span> {log.text.slice(2)}
                          </>
                        ) : (
                          log.text
                        )}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>

            <ArrowRight className={`mx-auto hidden h-5 w-5 self-center transition-colors duration-300 md:block ${step3Active ? "text-neutral-950" : "text-neutral-300"}`} />
            <ArrowRight className={`mx-auto h-5 w-5 rotate-90 transition-colors duration-300 md:hidden ${step3Active ? "text-neutral-950" : "text-neutral-300"}`} />

            {/* Step 3 — Your app is live */}
            <div
              className={`flex flex-col overflow-hidden rounded-xl border transition-colors duration-300 ${
                step3Active ? "border-neutral-950" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 truncate rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
                  {step3Active ? typedUrl : SITE_URL}
                  {step3Active && !urlTypingDone && <span className="animate-pulse">▍</span>}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className={`text-xs font-semibold transition-colors duration-300 ${step3Active ? "text-neutral-950" : "text-neutral-400"}`}>
                  03
                </span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <Globe className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-sm font-semibold">Your app is live</h3>
                {liveLineVisible ? (
                  <p className="motion-safe:animate-fade-up mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    Real login, real database, real URL.
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                    {step3Active ? "Deploying..." : "Waiting for deploy..."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="motion-safe:animate-fade-up mt-8 text-center text-sm text-neutral-500 [animation-delay:360ms]">
            Comes with team login and a real database — not just hosting.
          </p>
        </section>

        {/* ===== Feature tour ===== */}
        <section className="border-t border-neutral-200 bg-neutral-50 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Get a link, and so much more.
            </h2>

            {/* Tabs */}
            <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-semibold transition ${
                    tab === id
                      ? "border-neutral-950 bg-white"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>

            {/* Panel */}
            <div className="mt-6 grid grid-cols-1 gap-10 rounded-2xl border border-neutral-200 bg-white p-8 md:grid-cols-2 md:p-10">
              {tab === "login" && (
                <>
                  <div className="order-2 md:order-1">
                    <div className="overflow-hidden rounded-xl border border-neutral-200">
                      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
                        <Lock className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="font-mono text-xs text-neutral-500">amber-harbor-k3q7.embarko.ai</span>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Access</p>
                        <div className="mt-3 space-y-2">
                          {ACCESS_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAccess(opt.id)}
                              className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition ${
                                access === opt.id
                                  ? "border-neutral-950 bg-neutral-50"
                                  : "border-neutral-200 hover:border-neutral-300"
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span
                                  className={`h-3.5 w-3.5 rounded-full border-2 ${
                                    access === opt.id ? "border-neutral-950 bg-neutral-950" : "border-neutral-300"
                                  }`}
                                />
                                {opt.label}
                              </span>
                              {opt.note && <span className="text-xs text-neutral-400">{opt.note}</span>}
                            </button>
                          ))}
                        </div>
                        {access === "password" && (
                          <div className="mt-4 flex items-center gap-2">
                            <span className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm tracking-widest text-neutral-400">
                              ••••••••
                            </span>
                            <span className="rounded-lg bg-neutral-950 px-3.5 py-2 text-sm font-semibold text-white">
                              Unlock
                            </span>
                          </div>
                        )}
                        {access === "restricted" && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">alice@example.com</span>
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">bob@example.com</span>
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">@example.com</span>
                          </div>
                        )}
                        {access === "anyone" && (
                          <p className="mt-4 text-xs text-neutral-400">Anyone with the link can open this app.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="order-1 flex flex-col justify-center md:order-2">
                    <h3 className="text-xl font-bold">Your team logs in. You decide who does what.</h3>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                      Every app in your workspace uses the same identity. Invite by email, pick a
                      role, or lock it behind a password — done in one click.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      {['"Put a password on this app"', '"Invite bob@example.com to see this"', '"Make it public again"'].map((line) => (
                        <span key={line} className="w-fit rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-xs text-neutral-600">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {tab === "database" && (
                <>
                  <div className="order-2 md:order-1">
                    <div className="overflow-hidden rounded-xl border border-neutral-200">
                      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                        <span className="text-xs font-semibold text-neutral-950">Database</span>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">Postgres 16</span>
                      </div>
                      <div className="space-y-3 p-5">
                        <div className="rounded-lg bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-600 break-all">
                          postgres://example:••••••••@db.embarko.ai:5432/inventory
                        </div>
                        {[
                          ["Backup schedule", "Nightly · 02:00 UTC"],
                          ["Last backup", "14 min ago"],
                          ["Injected as", "DATABASE_URL"],
                        ].map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">{k}</span>
                            <span className="font-semibold text-neutral-950">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="order-1 flex flex-col justify-center md:order-2">
                    <h3 className="text-xl font-bold">A real database, provisioned in seconds.</h3>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                      Every app gets its own Postgres, backed up nightly. The connection string is
                      injected as an env var — your AI can find it, your code can use it.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      {['"Add a database to this app"', '"Import this CSV as a table"'].map((line) => (
                        <span key={line} className="w-fit rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-xs text-neutral-600">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {tab === "workspace" && (
                <>
                  <div className="order-2 md:order-1">
                    <div className="overflow-hidden rounded-xl border border-neutral-200">
                      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                        <span className="text-xs font-semibold text-neutral-950">Workspace · Example</span>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">3 apps</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2">
                        {[
                          ["Inventory", "inventory.example.embarko.ai"],
                          ["Onboarding", "onboard.example.embarko.ai"],
                          ["Expense desk", "expenses.example.embarko.ai"],
                        ].map(([name, url]) => (
                          <div key={name} className="rounded-lg border border-neutral-200 p-3">
                            <div className="text-sm font-semibold text-neutral-950">{name}</div>
                            <div className="mt-1 font-mono text-xs text-neutral-500 truncate">{url}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="order-1 flex flex-col justify-center md:order-2">
                    <h3 className="text-xl font-bold">All your team&apos;s apps, one dashboard, one bill.</h3>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                      Ship one app or thirty. Everyone on the team sees them all in one place —
                      no hunting for the URL of the tool you built two months ago.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      {['"Publish this to the example workspace"', '"Who else is in this workspace?"'].map((line) => (
                        <span key={line} className="w-fit rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-xs text-neutral-600">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-3xl font-bold">Questions</h2>
            <div className="mt-10 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                    {q}
                    <Plus className="h-4 w-4 flex-shrink-0 text-neutral-400 transition group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-neutral-50 px-8 py-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Your app is ready. Ship it.</h2>
            <p className="mx-auto mt-3 max-w-md text-neutral-600">
              Pick the tool you already build in — you&apos;ll be sharing a link before lunch.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </button>
              <Link href="/pricing" className="text-sm font-semibold text-neutral-600 underline underline-offset-4 hover:text-neutral-950">
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-neutral-200 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-neutral-500 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-neutral-950">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
            Embarko
          </div>
          <span>© 2026 Embarko</span>
          <Link href="/pricing" className="hover:text-neutral-950">Pricing</Link>
        </div>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
