/*
  AppHome — landing page
  Stack: React (Next.js App Router) + scoped CSS + inline lucide-style icons
  Ship state: production-ready v1
*/
"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

/* ---------------- Icons (lucide-style, inline) ---------------- */

const ICONS: Record<string, ReactNode> = {
  box: <><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>,
  server: <><rect x="2" y="4" width="20" height="8" rx="2" /><rect x="2" y="12" width="20" height="8" rx="2" /><path d="M6 8h.01M6 16h.01" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  claude: <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />,
  cursor: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  lovable: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />,
  v0: <path d="M17 5 7 19" />,
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  replit: <><path d="m4 17 6-6-6-6M12 19h8" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

function Ico({ n, sw = 1.8 }: { n: string; sw?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[n]}
    </svg>
  );
}

/* ---------------- Data ---------------- */

type Tool = { id: string; name: string; label: string; sub: string; kind: "command" | "rules" | "import" };

const TOOLS: Tool[] = [
  { id: "claude", name: "Claude Code", label: "Claude Code", sub: "Skill file · 30 sec", kind: "command" },
  { id: "cursor", name: "Cursor", label: "Cursor", sub: "Rules file · 30 sec", kind: "rules" },
  { id: "lovable", name: "Lovable", label: "Lovable", sub: "Import project · 1 min", kind: "import" },
  { id: "v0", name: "v0", label: "v0", sub: "Import project · 1 min", kind: "import" },
  { id: "bolt", name: "Bolt", label: "Bolt", sub: "Import project · 1 min", kind: "import" },
  { id: "replit", name: "Replit", label: "Replit", sub: "Import project · 1 min", kind: "import" },
];

const PEOPLE = [
  { nm: "Alice", role: "Admin" },
  { nm: "Bob", role: "Editor" },
  { nm: "Priya", role: "Editor" },
  { nm: "Marcus", role: "Viewer" },
  { nm: "Jenna", role: "Viewer" },
  { nm: "Tom", role: "Viewer" },
  { nm: "Sam", role: "Viewer" },
  { nm: "Nina", role: "Viewer" },
];
const ROLE_BG: Record<string, string> = { Admin: "#ff4d00", Editor: "#404040", Viewer: "#a3a3a3" };

type Cell = string | { pill: string; tone: "ok" | "low" };
type AppEx = { url: string; title: string; chip: string; cols: string[]; rows: Cell[][] };

/* One example app per rotating source (same order as ROT_SOURCES) */
const APPS: AppEx[] = [
  {
    url: "inventory.acme.apphome.dev", title: "Inventory", chip: "5 items",
    cols: ["SKU", "Item", "Qty", "Status", "Last edited"],
    rows: [
      ["SKU-1024", "Aluminum bracket", "340", { pill: "In stock", tone: "ok" }, "2h ago"],
      ["SKU-1088", "M6 hex bolt", "12", { pill: "Low", tone: "low" }, "5h ago"],
      ["SKU-2001", "Rubber gasket", "880", { pill: "In stock", tone: "ok" }, "1d ago"],
      ["SKU-2140", "Steel washer", "45", { pill: "Low", tone: "low" }, "1d ago"],
      ["SKU-3300", "Nylon spacer", "1200", { pill: "In stock", tone: "ok" }, "3d ago"],
    ],
  },
  {
    url: "support.acme.apphome.dev", title: "Tickets", chip: "5 open",
    cols: ["ID", "Subject", "Priority", "Status", "Updated"],
    rows: [
      ["#4021", "Login loop on SSO", "High", { pill: "Open", tone: "low" }, "8m ago"],
      ["#4019", "CSV export stuck", "Med", { pill: "Open", tone: "low" }, "22m ago"],
      ["#4015", "Typo on invoice", "Low", { pill: "Done", tone: "ok" }, "1h ago"],
      ["#4008", "API returning 500s", "High", { pill: "Open", tone: "low" }, "2h ago"],
      ["#3999", "Add dark mode", "Low", { pill: "Done", tone: "ok" }, "1d ago"],
    ],
  },
  {
    url: "crm.acme.apphome.dev", title: "Pipeline", chip: "5 deals",
    cols: ["Company", "Owner", "Value", "Stage", "Updated"],
    rows: [
      ["Northwind", "Dana", "$240k", { pill: "Won", tone: "ok" }, "2h ago"],
      ["Globex", "Marco", "$88k", { pill: "Demo", tone: "low" }, "5h ago"],
      ["Initech", "Priya", "$32k", { pill: "Demo", tone: "low" }, "1d ago"],
      ["Umbrella", "Sam", "$150k", { pill: "Won", tone: "ok" }, "1d ago"],
      ["Soylent", "Tom", "$12k", { pill: "Lost", tone: "low" }, "3d ago"],
    ],
  },
  {
    url: "orders.acme.apphome.dev", title: "Orders", chip: "5 today",
    cols: ["Order", "Customer", "Total", "Status", "Placed"],
    rows: [
      ["#A-311", "J. Lee", "$420", { pill: "Paid", tone: "ok" }, "3m ago"],
      ["#A-310", "K. Ito", "$88", { pill: "Refund", tone: "low" }, "12m ago"],
      ["#A-309", "R. Cruz", "$1,200", { pill: "Paid", tone: "ok" }, "40m ago"],
      ["#A-308", "M. Diaz", "$56", { pill: "Paid", tone: "ok" }, "1h ago"],
      ["#A-307", "S. Roy", "$310", { pill: "Failed", tone: "low" }, "2h ago"],
    ],
  },
  {
    url: "bookings.acme.apphome.dev", title: "Bookings", chip: "5 today",
    cols: ["Ref", "Guest", "Room", "Status", "Check-in"],
    rows: [
      ["BK-77", "A. Park", "Suite 4", { pill: "Confirmed", tone: "ok" }, "2pm"],
      ["BK-76", "L. Wu", "Room 12", { pill: "Pending", tone: "low" }, "3pm"],
      ["BK-75", "T. Blake", "Room 9", { pill: "Confirmed", tone: "ok" }, "4pm"],
      ["BK-74", "D. Ross", "Suite 2", { pill: "Cancelled", tone: "low" }, "5pm"],
      ["BK-73", "E. Vance", "Room 7", { pill: "Confirmed", tone: "ok" }, "6pm"],
    ],
  },
  {
    url: "cms.acme.apphome.dev", title: "Articles", chip: "5 drafts",
    cols: ["Title", "Author", "Words", "Status", "Edited"],
    rows: [
      ["Onboarding guide", "Priya", "1,204", { pill: "Published", tone: "ok" }, "2h ago"],
      ["Q3 changelog", "Bob", "640", { pill: "Draft", tone: "low" }, "5h ago"],
      ["Pricing update", "Dana", "880", { pill: "Review", tone: "low" }, "1d ago"],
      ["Security post", "Sam", "1,530", { pill: "Published", tone: "ok" }, "1d ago"],
      ["API tutorial", "Nina", "990", { pill: "Draft", tone: "low" }, "3d ago"],
    ],
  },
  {
    url: "expenses.acme.apphome.dev", title: "Expenses", chip: "5 items",
    cols: ["ID", "Vendor", "Amount", "Status", "Date"],
    rows: [
      ["EX-88", "AWS", "$2,400", { pill: "Approved", tone: "ok" }, "2h ago"],
      ["EX-87", "Figma", "$144", { pill: "Pending", tone: "low" }, "5h ago"],
      ["EX-86", "Linear", "$96", { pill: "Approved", tone: "ok" }, "1d ago"],
      ["EX-85", "Notion", "$200", { pill: "Pending", tone: "low" }, "1d ago"],
      ["EX-84", "Vercel", "$600", { pill: "Approved", tone: "ok" }, "3d ago"],
    ],
  },
];

const PROB = [
  { ic: "lock", t: "No login", c: "You built the UI, not the auth." },
  { ic: "database", t: "No real DB", c: "SQLite. Resets. Every time." },
  { ic: "users", t: "No permissions", c: "Alice and Bob get the same view." },
  { ic: "globe", t: "No URL", c: "localhost:3000 isn't a link." },
];

const STEPS = [
  { n: "01", ic: "box", t: "Bring your app", c: "From Claude Code, Cursor, Lovable — or a ZIP." },
  { n: "02", ic: "server", t: "We host it", c: "We detect your stack, build it, and give it a URL." },
  { n: "03", ic: "lock", t: "Turn on team login", c: "One toggle. Google, Microsoft, or magic link." },
  { n: "04", ic: "send", t: "Share the link", c: "Your team logs in and uses it." },
];

type Mk = "yes" | "no" | "part" | { t: "no"; note: string };
const COMPARE: { f: string; a: Mk; b: Mk; c: Mk }[] = [
  { f: "Bring an app from any AI tool", a: "yes", b: { t: "no", note: "their own only" }, c: "yes" },
  { f: "Login, roles, and audit included", a: "yes", b: "part", c: { t: "no", note: "wire it yourself" } },
  { f: "One workspace, one bill for all your apps", a: "yes", b: "no", c: { t: "no", note: "per-app pricing" } },
  { f: "Neutral — not tied to a specific AI builder", a: "yes", b: "no", c: "yes" },
  { f: "Built for a team of 5–50, not a public product at scale", a: "yes", b: "part", c: { t: "no", note: "overkill" } },
];

const SECURITY = [
  { ic: "shield", t: "Isolated by default", c: "Every app in its own container. Every database is its own. Nothing shared." },
  { ic: "key", t: "Secrets, not strings", c: "API keys and env vars stored server-side. Never in your code. Auto-rotated on request." },
  { ic: "eye", t: "Full audit trail", c: "Who logged in, who accessed which app, who changed what. Exportable for compliance." },
];

const PRICING = [
  { nm: "Solo", price: "$0", per: "/mo", who: "You, alone", inc: ["3 apps", "3 users", "1 database", ".apphome.dev subdomain"], cta: "Start free →", href: "#cta", primary: false, pop: false },
  { nm: "Team", price: "$49", per: "/mo per workspace", who: "A team of up to 25", inc: ["Unlimited apps", "25 users", "5 databases", "Custom domain", "Audit log"], cta: "Bring your app →", href: "#cta", primary: true, pop: true },
  { nm: "Business", price: "$199", per: "/mo per workspace", who: "A team of 25+", inc: ["Unlimited users", "25 databases", "Google/Microsoft SSO", "Priority support", "Longer audit retention"], cta: "Bring your app →", href: "#cta", primary: false, pop: false },
  { nm: "Enterprise", price: "Talk to us", per: "", who: "200+ people, IT compliance", inc: ["SAML", "SCIM", "VPC-peered DBs", "Dedicated instance", "Custom retention"], cta: "Book a call →", href: "#", primary: false, pop: false },
];

const FAQ = [
  { q: "How is this different from Vercel or Netlify?", a: "They host code. We host teams. Logins, roles, and a shared dashboard for your whole team come standard." },
  { q: "How is this different from Lovable, Replit, or Bolt?", a: "They build the app. We host it — regardless of who built it. Bring an app from any tool." },
  { q: "I built with Claude Code. What do I do?", a: "Install our Claude Code skill file (one command). Then say “deploy to my AppHome workspace.” Your AI does the rest." },
  { q: "I built with Cursor / v0 / Lovable / Bolt / Replit.", a: "Same idea. Each tool gets its own connector on the CTA above. Click the one you use, follow the 30-second setup." },
  { q: "I already use Supabase or Clerk. Do I have to switch?", a: "No. Bring your app as-is. Our auth is optional — most people turn it on because it's simpler for the app-per-team case." },
  { q: "What frameworks do you support?", a: "Next.js, React (Vite), plain Node/Express, FastAPI, Python, static sites. If you're using something unusual, tell us." },
  { q: "Can I use my own domain?", a: "Yes, on Team and up. Point a CNAME, we handle HTTPS." },
  { q: "Where is my data hosted?", a: "US or EU, your choice. Set it per workspace." },
  { q: "Can I export? Am I locked in?", a: "Your code is yours — it's your Git. DB export is one click. Nothing about AppHome cages you." },
  { q: "What if my AI writes bad code that leaks secrets?", a: "Our runtime rejects hardcoded secrets in build. You get env vars for free. This is the single most common vibe-coding vulnerability, and we make it structurally hard to ship." },
];

/* ---------------- Sub-components ---------------- */

const delay = (i: number): CSSProperties => ({ transitionDelay: `${i * 65}ms` });

function ToolGrid({ onPick }: { onPick: (t: Tool) => void }) {
  return (
    <div className="ah-tool-grid">
      {TOOLS.map((t, i) => (
        <button
          key={t.id}
          type="button"
          className="ah-tool"
          onClick={() => onPick(t)}
          aria-label={`Continue with ${t.name}`}
          data-reveal
          style={delay(i)}
        >
          <span className="ah-tool-ic"><Ico n={t.id} /></span>
          <span className="ah-tool-tx">
            <span className="ah-tool-label">{t.label}</span>
            <span className="ah-tool-sub">{t.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Mark({ v }: { v: Mk }) {
  const val = typeof v === "string" ? v : v.t;
  const note = typeof v === "object" ? v.note : null;
  if (val === "yes") return <span className="ah-yes" aria-label="Yes">✓</span>;
  if (val === "part") return <span className="ah-part">Partial</span>;
  return <span className="ah-no" aria-label="No">✗{note ? <em> ({note})</em> : null}</span>;
}

/* ---------------- Page ---------------- */

export default function AppHomePage() {
  const [tool, setTool] = useState<Tool | null>(null);
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [rot, setRot] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Rotating hero source + synced app example */
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setRot((n) => (n + 1) % APPS.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  /* Scroll-reveal + sticky-nav shadow */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("reveal-on");

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reveal = (el: Element) => el.classList.add("in");

    let io: IntersectionObserver | undefined;
    let timer: number | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              reveal(e.target);
              io?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      targets.forEach((el) => io!.observe(el));
      // safety net: never leave content hidden
      timer = window.setTimeout(() => targets.forEach(reveal), 2500);
    } else {
      targets.forEach(reveal);
    }

    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io?.disconnect();
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* Modal open/close side-effects */
  useEffect(() => {
    document.body.style.overflow = tool ? "hidden" : "";
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTool(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [tool]);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="apphome" data-theme="light" ref={rootRef}>
      {/* ===== Nav ===== */}
      <nav className={`ah-nav${scrolled ? " scrolled" : ""}`}>
        <div className="ah-nav-inner">
          <a className="ah-brand" href="#top"><span className="ah-brand-dot" />AppHome</a>
          <div className="ah-nav-links">
            <a href="#tour">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">Docs</a>
            <a href="#">Blog</a>
          </div>
          <div className="ah-nav-right">
            <a className="ah-btn ah-btn-ghost ah-nav-login" href="#">Log in</a>
            <a className="ah-btn ah-btn-primary" href="#cta">Bring your app <Ico n="arrow" /></a>
          </div>
        </div>
      </nav>

      <main id="top">
        {/* ===== Hero ===== */}
        <section className="ah-hero">
          <div className="ah-hero-bg" aria-hidden="true" />
          <div className="ah-hero-glow" aria-hidden="true" />
          <div className="ah-wrap">
            <div className="ah-hero-grid">
              <div>
                <div className="ah-hero-top">
                  <span className="ah-kicker" data-reveal>
                    <span className="ah-blink" aria-hidden="true" />
                    live · <b>3 apps</b> deployed · 8 teammates online
                  </span>
                  <h1 data-reveal style={delay(1)}>
                    <span className="ah-hero-l1">
                      <span>Build anywhere,</span>
                    </span>
                    <span className="ah-hero-l2">ship here</span>
                  </h1>
                  <p className="ah-hero-sub" data-reveal style={delay(2)}>Bring an app from Claude Code, Cursor, Lovable — or a ZIP. AppHome gives it a <b>real login, a real database, real users and roles</b>, and a URL your team can bookmark. In 15 minutes.</p>
                </div>

                <div id="cta">
                  <p className="ah-cta-cap" data-reveal style={delay(3)}>Start from your editor — your AI already knows AppHome.</p>
                  <ToolGrid onPick={setTool} />
                  <p className="ah-hero-more" data-reveal style={delay(6)}>no AWS · no credit card to start · export anytime</p>
                </div>

                <div className="ah-hero-stats" data-reveal style={delay(6)}>
                  <div className="ah-stat"><b>15 min</b><span>To first deploy</span></div>
                  <div className="ah-stat"><b>8s</b><span>Postgres ready</span></div>
                  <div className="ah-stat"><b>0</b><span>Servers to run</span></div>
                </div>
              </div>

              {/* Hero visual — product screenshot mock */}
              <div className="ah-browser-wrap" data-reveal style={delay(3)}>
                <span className="ah-badge b1"><span className="ah-live" aria-hidden="true" /> 8 teammates online</span>
                <div className="ah-browser" role="img" aria-label={`AppHome workspace: a ${APPS[rot].title} app with 8 team members and roles`}>
                  <div className="ah-browser-bar">
                    <div className="ah-dots"><span /><span /><span /></div>
                    <div className="ah-url" key={`url-${rot}`}>{APPS[rot].url}</div>
                  </div>
                  <div className="ah-app">
                    <div className="ah-app-main" key={`app-${rot}`}>
                      <div className="ah-app-h">
                        <span className="ah-app-title">{APPS[rot].title}</span>
                        <span className="ah-chip">{APPS[rot].chip}</span>
                      </div>
                      <table className="ah-table">
                        <thead><tr>{APPS[rot].cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                          {APPS[rot].rows.map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td key={ci}>
                                  {typeof cell === "string"
                                    ? cell
                                    : <span className={`ah-st ${cell.tone}`}>{cell.pill}</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="ah-access">
                      <div className="ah-access-h">Access · 8</div>
                      <div className="ah-ppl">
                        {PEOPLE.map((p) => (
                          <div className="ah-person" key={p.nm}>
                            <span className="ah-av" style={{ background: ROLE_BG[p.role] }}>{p.nm.charAt(0)}</span>
                            <span className="ah-person-nm">{p.nm}</span>
                            <span className={`ah-role ${p.role.toLowerCase()}`}>{p.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="ah-badge b2">Deployed <b>90s</b> ago</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Problem ===== */}
        <section className="ah-section">
          <div className="ah-wrap">
            <div className="ah-head" data-reveal>
              <span className="ah-eyebrow">The 15-minute wall</span>
              <h2>The AI wrote the app in an hour. Sharing it with your team is where it dies.</h2>
            </div>
            <div className="ah-prose">
              <p data-reveal>You&apos;ve been there. The app works on your laptop. You send a Loom to a teammate. They say &ldquo;cool, how do I use it?&rdquo; And you realize you don&apos;t know.</p>
              <p data-reveal style={delay(1)}>Login? Not built. Database? SQLite that resets on restart. Alice needs to edit, Bob only to read — but roles don&apos;t exist. Custom domain? DNS? HTTPS? Somewhere in there, you close the laptop and the app dies.</p>
            </div>
            <div className="ah-mini">
              {PROB.map((p, i) => (
                <div className="ah-mini-card" key={p.t} data-reveal style={delay(i)}>
                  <span className="ah-mini-ic"><Ico n={p.ic} /></span>
                  <h4>{p.t}</h4>
                  <p>{p.c}</p>
                </div>
              ))}
            </div>
            <p className="ah-note" data-reveal>Most AI-built apps never leave the laptop. This is why.</p>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section className="ah-section tint">
          <div className="ah-wrap">
            <div className="ah-head center" data-reveal>
              <span className="ah-eyebrow">How AppHome works</span>
              <h2>Bring the app. We handle the rest.</h2>
              <p>Four steps. Fifteen minutes. Zero AWS.</p>
            </div>
            <div className="ah-steps">
              {STEPS.map((s, i) => (
                <div className="ah-step" key={s.n} data-reveal style={delay(i)}>
                  <span className="ah-step-n">{s.n}</span>
                  <span className="ah-step-ic"><Ico n={s.ic} /></span>
                  <h4>{s.t}</h4>
                  <p>{s.c}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <p className="ah-note" data-reveal>Everything else — Postgres, backups, HTTPS, custom domains, roles, audit — is on by default.</p>
            </div>
          </div>
        </section>

        {/* ===== Product tour ===== */}
        <section className="ah-section" id="tour">
          <div className="ah-wrap">
            <div className="ah-head center" data-reveal>
              <span className="ah-eyebrow">What you get</span>
              <h2>A real backend, without becoming a backend engineer.</h2>
            </div>
            <div className="ah-tour">
              {/* Block 1 */}
              <div className="ah-block" data-reveal>
                <div className="ah-block-media">
                  <div className="ah-mock">
                    <div className="ah-mock-h"><span>Members</span><span className="ah-chip">5</span></div>
                    <div className="ah-mock-b">
                      {[
                        { nm: "Alice Nguyen", em: "alice@acme.co", role: "Admin", la: "now" },
                        { nm: "Bob Reyes", em: "bob@acme.co", role: "Editor", la: "2h ago" },
                        { nm: "Priya Shah", em: "priya@acme.co", role: "Editor", la: "1d ago" },
                        { nm: "Marcus Lee", em: "marcus@acme.co", role: "Viewer", la: "3d ago" },
                        { nm: "Jenna Ruiz", em: "jenna@acme.co", role: "Viewer", la: "1w ago" },
                      ].map((m) => (
                        <div className="ah-row" key={m.em}>
                          <span className="ah-av" style={{ background: ROLE_BG[m.role] }}>{m.nm.charAt(0)}</span>
                          <span className="nm">{m.nm}</span>
                          <span className="em">{m.em}</span>
                          <span className="ah-sel">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ah-block-copy">
                  <span className="ah-eyebrow">Identity</span>
                  <h3>Your team logs in. You decide who does what.</h3>
                  <p>Every app in your workspace uses the same identity. Invite by email, pick a role (Admin, Editor, Viewer), done. Turn on Google or Microsoft SSO in one click. New teammate? Add them once, they get access to every app in the workspace.</p>
                </div>
              </div>

              {/* Block 2 (reversed) */}
              <div className="ah-block rev" data-reveal>
                <div className="ah-block-media">
                  <div className="ah-mock">
                    <div className="ah-mock-h"><span>Database</span><span className="ah-chip">Postgres 16</span></div>
                    <div className="ah-mock-b ah-kv">
                      <div className="ah-code">postgres://acme:••••••••@db.apphome.dev:5432/inventory</div>
                      <div className="ah-meta-row"><span>Backup schedule</span><span>Nightly · 02:00 UTC</span></div>
                      <div className="ah-meta-row"><span>Last backup</span><span>14 min ago</span></div>
                      <div className="ah-meta-row"><span>Injected as</span><span>DATABASE_URL</span></div>
                    </div>
                  </div>
                </div>
                <div className="ah-block-copy">
                  <span className="ah-eyebrow">Database</span>
                  <h3>A real database, provisioned in 8 seconds.</h3>
                  <p>Every app gets its own Postgres, backed up nightly. Connection string is injected as an env var — your AI can find it, your code can use it. No RDS setup. No connection pool tuning. No 3am migration panic. Import from a CSV if you&apos;re starting from a spreadsheet.</p>
                </div>
              </div>

              {/* Block 3 */}
              <div className="ah-block" data-reveal>
                <div className="ah-block-media">
                  <div className="ah-mock">
                    <div className="ah-mock-h"><span>Workspace · Acme</span><span className="ah-chip">6 apps</span></div>
                    <div className="ah-mock-b">
                      <div className="ah-apps">
                        {[
                          { an: "Inventory", au: "inventory.acme.apphome.dev", ad: "Deployed 2h ago" },
                          { an: "Onboarding", au: "onboard.acme.apphome.dev", ad: "Deployed 1d ago" },
                          { an: "Expense desk", au: "expenses.acme.apphome.dev", ad: "Deployed 3d ago" },
                          { an: "Shift planner", au: "shifts.acme.apphome.dev", ad: "Deployed 5d ago" },
                          { an: "QA checklist", au: "qa.acme.apphome.dev", ad: "Deployed 1w ago" },
                          { an: "Lead intake", au: "leads.acme.apphome.dev", ad: "Deployed 2w ago" },
                        ].map((a) => (
                          <div className="ah-apptile" key={a.an}>
                            <div className="an">{a.an}</div>
                            <div className="au">{a.au}</div>
                            <div className="ad">{a.ad}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ah-block-copy">
                  <span className="ah-eyebrow">Workspace</span>
                  <h3>All your team&apos;s apps in one place. One bill.</h3>
                  <p>Ship one app or thirty. Your team sees them all in one dashboard. IT gets one invoice. No per-app pricing surprises. No hunting for the URL of the tool you built two months ago.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Comparison ===== */}
        <section className="ah-section tint">
          <div className="ah-wrap">
            <div className="ah-head center" data-reveal>
              <span className="ah-eyebrow">Why AppHome</span>
              <h2>Not Vercel. Not Lovable. Not Retool.</h2>
              <p>There&apos;s a specific job we do that nobody else does: run the app your AI built, for your team.</p>
            </div>

            <div className="ah-cmp" data-reveal>
              <table className="ah-cmp-tb">
                <thead>
                  <tr><th></th><th className="us">AppHome</th><th>AI builders</th><th>Big cloud</th></tr>
                </thead>
                <tbody>
                  {COMPARE.map((r) => (
                    <tr key={r.f}>
                      <td>{r.f}</td>
                      <td className="us"><Mark v={r.a} /></td>
                      <td><Mark v={r.b} /></td>
                      <td><Mark v={r.c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="ah-cmp-cards">
              {[
                { h: "AppHome", k: "a" as const },
                { h: "AI builders (Lovable, Replit, Bolt)", k: "b" as const },
                { h: "Big cloud (Vercel, Railway, AWS)", k: "c" as const },
              ].map((col) => (
                <div className="ah-cmp-card" key={col.h}>
                  <h4>{col.h}</h4>
                  {COMPARE.map((r) => (
                    <div className="ah-cmp-line" key={r.f}><span>{r.f}</span><Mark v={r[col.k]} /></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Security ===== */}
        <section className="ah-section">
          <div className="ah-wrap">
            <div className="ah-head center" data-reveal>
              <span className="ah-eyebrow">Yes, it will approve</span>
              <h2>Security your IT team will actually sign off on.</h2>
              <p>AI-generated code is famous for hardcoded keys and missing auth. We&apos;re the counterweight.</p>
            </div>
            <div className="ah-sec3">
              {SECURITY.map((s, i) => (
                <div className="ah-sec-card" key={s.t} data-reveal style={delay(i)}>
                  <span className="ah-sec-ic"><Ico n={s.ic} /></span>
                  <h4>{s.t}</h4>
                  <p>{s.c}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <p className="ah-note" data-reveal>SSO (Google, Microsoft) on Team. SAML on Business. EU or US hosting. SOC 2 in progress.</p>
            </div>
          </div>
        </section>

        {/* ===== Pricing ===== */}
        <section className="ah-section tint" id="pricing">
          <div className="ah-wrap">
            <div className="ah-head center" data-reveal>
              <span className="ah-eyebrow">Pricing</span>
              <h2>One flat price per workspace. Ship as many apps as you want.</h2>
              <p>No per-app fees. No compute-second surprises. You know the bill.</p>
            </div>
            <div className="ah-price">
              {PRICING.map((p, i) => (
                <div className={`ah-plan${p.pop ? " pop" : ""}`} key={p.nm} data-reveal style={delay(i)}>
                  {p.pop && <span className="ah-plan-badge">Most popular</span>}
                  <div className="ah-plan-nm">{p.nm}</div>
                  <div className="ah-plan-price">{p.price}<span style={{ fontSize: ".8rem", fontWeight: 400, color: "var(--faint)", fontFamily: "var(--sans)" }}> {p.per}</span></div>
                  <div className="ah-plan-for">{p.who}</div>
                  <ul className="ah-plan-inc">
                    {p.inc.map((i) => (
                      <li key={i}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{ICONS.check}</svg>{i}</li>
                    ))}
                  </ul>
                  <a className={`ah-btn ${p.primary ? "ah-btn-accent" : "ah-btn-outline"}`} href={p.href}>{p.cta}</a>
                </div>
              ))}
            </div>
            <p className="ah-price-note" data-reveal>Overages for compute and bandwidth priced at cost. No AI-token markup. Ever.</p>
          </div>
        </section>

        {/* ===== Quote ===== */}
        <section className="ah-section">
          <div className="ah-wrap">
            <figure className="ah-quote" data-reveal>
              <div className="ah-quote-mark">&ldquo;</div>
              {/* TODO: replace with real customer quote */}
              <p>I built an inventory tool with Claude Code on a Sunday. By Monday lunch, eight of my warehouse crew were logging in with their Google accounts. I never touched AWS. That&apos;s the whole review.</p>
              <cite>— Head of Ops, mid-size 3PL company</cite>
            </figure>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="ah-section tint" id="faq">
          <div className="ah-wrap">
            <div className="ah-head center" data-reveal>
              <span className="ah-eyebrow">Questions</span>
              <h2>The stuff you&apos;d ask on a demo call.</h2>
            </div>
            <div className="ah-faq" data-reveal>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}<span className="ah-faq-plus"><Ico n="plus" sw={2} /></span></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="ah-final" id="import">
          <div className="ah-wrap">
            <div className="ah-final-panel" data-reveal>
              <h2>Your team is ready.<br />Your app is ready.<br />Ship it.</h2>
              <p className="ah-final-sub">Pick the tool you already build in. You&apos;ll be sharing a link before lunch.</p>
              <ToolGrid onPick={setTool} />
              <p className="ah-final-more">Or <a href="#">import from GitHub / ZIP →</a> if you already have code.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="ah-foot">
        <div className="ah-wrap">
          <div className="ah-foot-grid">
            <div className="ah-foot-brand">
              <a className="ah-brand" href="#top"><span className="ah-brand-dot" />AppHome</a>
              <p>The production home for AI-built apps.</p>
              <div className="ah-foot-copy">© 2026 AppHome</div>
            </div>
            <div className="ah-foot-col">
              <h5>Product</h5>
              <a href="#pricing">Pricing</a><a href="#">Security</a><a href="#">Changelog</a><a href="#">Roadmap</a>
            </div>
            <div className="ah-foot-col">
              <h5>For builders</h5>
              <a href="#">Claude Code</a><a href="#">Cursor</a><a href="#">Lovable</a><a href="#">v0</a><a href="#">Bolt</a><a href="#">Replit</a><a href="#">GitHub</a><a href="#">MCP docs</a>
            </div>
            <div className="ah-foot-col">
              <h5>Company</h5>
              <a href="#">About</a><a href="#">Blog</a><a href="#">Careers</a><a href="#">Contact</a><a href="#">Status</a>
            </div>
          </div>
        </div>
        <div className="ah-foot-bottom">
          <span>© 2026 AppHome</span>
          <span><a href="#">Terms</a> · <a href="#">Privacy</a> · <a href="#">Security</a></span>
        </div>
      </footer>

      {/* ===== Tool modal ===== */}
      <div className={`ah-overlay${tool ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setTool(null)}>
        {tool && (
          <div className="ah-modal" role="dialog" aria-modal="true" aria-label={tool.label}>
            <button className="ah-modal-close" onClick={() => setTool(null)} aria-label="Close"><Ico n="x" sw={2} /></button>
            <span className="ah-modal-ic"><Ico n={tool.id} /></span>
            <h3>{tool.kind === "import" ? `Ship from ${tool.name}` : `Build with ${tool.name}`}</h3>

            {tool.kind === "command" && (
              <>
                <p>Add AppHome as a skill to Claude Code. Paste this in your terminal:</p>
                <div className="ah-modal-code">
                  curl -fsSL https://apphome.dev/install/claude-code | sh
                  <button className="ah-copy-btn" onClick={() => copy("curl -fsSL https://apphome.dev/install/claude-code | sh")}>{copied ? "Copied" : "Copy"}</button>
                </div>
                <p>Now, in Claude Code, say: <em>&ldquo;Deploy this app to my AppHome workspace.&rdquo;</em> We&apos;ll open a browser window to authenticate. First deploy takes ~90 seconds.</p>
                <p className="ah-modal-sec">New to AppHome? <a href="#">Create a workspace first →</a></p>
              </>
            )}

            {tool.kind === "rules" && (
              <>
                <p>Drop this <code>.cursorrules</code> file into your project root:</p>
                <div className="ah-modal-code">
                  {"# AppHome rules\nWhen the user asks to deploy, run: apphome deploy"}
                  <button className="ah-copy-btn" onClick={() => copy("# AppHome rules\nWhen the user asks to deploy, run: apphome deploy")}>{copied ? "Copied" : "Copy"}</button>
                </div>
                <p>Then just tell Cursor to deploy. Same auth flow.</p>
              </>
            )}

            {tool.kind === "import" && (
              <>
                <p>1. Export your project from {tool.name}. 2. Drop the folder here, or paste the export URL:</p>
                <div className="ah-drop">Drag &amp; drop your project folder</div>
                <input className="ah-modal-input" placeholder={`Paste your ${tool.name} export URL`} aria-label={`${tool.name} export URL`} />
                <p className="ah-modal-sec">We&apos;ll pick up the stack automatically. Auth, DB, and hosting take about 60 seconds.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
