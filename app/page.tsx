import { AppsMarquee } from "./components/AppsMarquee";
import { EarlyAccessProvider, GetAccessButton } from "./components/EarlyAccess";
import { Header } from "./components/Header";
import { HeroEntry } from "./components/HeroEntry";
import { Logo } from "./components/Logo";

/* ---------- Section data ---------- */

const LOOP = [
  {
    k: "Create",
    d: "Describe an app, drop a folder, or connect a repo. It goes live in seconds.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    k: "Share",
    d: "Copy the live link. Your whole team is already logged in — no new passwords.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
      </svg>
    ),
  },
  {
    k: "Change",
    d: "Ask for a change in plain English. Review it on a preview. Approve, and it’s live.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    ),
  },
  {
    k: "Grow",
    d: "Every app lives in one workspace. Your collection grows into the tools you run on.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

const CAPS = [
  { t: "Collect payments", s: "Charge for it, take subscriptions, get paid worldwide.", i: "M2 8h20M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2M2 8v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M6 15h4" },
  { t: "Send WhatsApp updates", s: "Text and email people the moment something happens.", i: "M4 20l1.5-4A8 8 0 1 1 9 19.5L4 20Z" },
  { t: "AI built in", s: "Chat, image generation, search — no API keys to manage.", i: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" },
  { t: "Login for your team", s: "Everyone in your workspace is signed in automatically.", i: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" },
  { t: "Save data forever", s: "Enter it once. Come back tomorrow — it’s still there.", i: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" },
  { t: "Works on phones", s: "Your apps look right on any screen, out of the box.", i: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM11 18h2" },
  { t: "Attach files & photos", s: "Upload receipts, PDFs, images — served back fast.", i: "M21 15V6a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14M12 11v6M9 14h6" },
  { t: "Work together live", s: "Many people, one app, updating in real time.", i: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
];

const GALLERY = [
  { t: "Order Tracker", s: "Log orders, see status at a glance", c: "#86F09B" },
  { t: "Expense Approvals", s: "Submit, approve, reimburse", c: "#6BE8C0" },
  { t: "Lead Intake", s: "Capture leads, get notified", c: "#C7F58A" },
  { t: "Appointment Booking", s: "Let customers pick a slot", c: "#7BC8F0" },
  { t: "Employee Checklist", s: "Daily tasks, done and signed", c: "#F0D06E" },
  { t: "Customer Feedback", s: "Collect ratings and notes", c: "#B79BF0" },
  { t: "Inventory Log", s: "Track stock in and out", c: "#F0A18A" },
  { t: "Complaint Desk", s: "Log issues, resolve, follow up", c: "#8AF0D0" },
  { t: "Sales Leaderboard", s: "See who’s ahead this month", c: "#F0A6C4" },
];

const COMPARE = {
  cols: ["hostnsoft", "No-code builders", "Hosting platforms", "Backend tools", "AI chat artifacts"],
  rows: [
    { label: "Built for non-technical users", v: ["yes", "yes", "no", "no", "part"] },
    { label: "Bring apps made by any AI", v: ["yes", "no", "yes", "yes", "no"] },
    { label: "Backend included, zero config", v: ["yes", "yes", "no", "part", "no"] },
    { label: "Change-with-approval loop", v: ["yes", "no", "no", "no", "no"] },
    { label: "Team & workspace built in", v: ["yes", "yes", "part", "no", "no"] },
    { label: "Live, shareable URL", v: ["yes", "yes", "yes", "no", "no"] },
  ],
};

const TRUST = [
  { t: "Your data is yours", s: "Export everything, any time. No lock-in, no hostage-taking.", i: "M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4ZM9 12l2 2 4-4" },
  { t: "Nothing changes without approval", s: "Every AI change waits on a preview until an admin says yes.", i: "M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7-7 9-4-2-7-4.5-7-9V7l7-4Z" },
  { t: "You control who sees what", s: "Admin, Editor, Viewer roles — set at the workspace level.", i: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" },
  { t: "Backed up automatically", s: "Your apps and data are backed up so a bad day isn’t a lost one.", i: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" },
];

const FAQ = [
  {
    q: "Do I need to know how to code?",
    a: "No. Describe the app you want in plain English, or drop in something you already made with an AI tool. hostnsoft handles the URL, the database, logins, and everything else behind the scenes.",
  },
  {
    q: "What can I bring in?",
    a: "A prompt (start from nothing), a folder or zip exported from ChatGPT, Claude, Bolt, v0, Lovable or a plain HTML export, or a GitHub repo that auto-deploys on every push.",
  },
  {
    q: "What if AI breaks something my business depends on?",
    a: "It can’t — not silently. Every change lands on a preview URL first with a plain-English summary of what changed. Nothing goes live until an admin approves it, and every change is logged.",
  },
  {
    q: "Who can see and use my apps?",
    a: "By default, only members of your workspace. Everyone there is signed in automatically. Sharing an app outside your workspace is a deliberate, one-click action with a clear warning.",
  },
  {
    q: "What’s built in?",
    a: "Hosting, a database, team login, file uploads, AI, realtime collaboration, payments, and email/WhatsApp/SMS messaging — all zero-config. That fixed set is the whole platform, on purpose.",
  },
  {
    q: "When can I start?",
    a: "We’re onboarding early-access workspaces now, ahead of general availability later this year. Join the list and we’ll reach out with an invite.",
  },
];

/* ---------- Small helpers ---------- */

function Cell({ v }: { v: string }) {
  if (v === "yes") return <span className="cmp yes" aria-label="Yes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>;
  if (v === "part") return <span className="cmp part" aria-label="Partial">Partial</span>;
  return <span className="cmp no" aria-label="No"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></span>;
}

export default function Home() {
  return (
    <EarlyAccessProvider>
      <Header />

      {/* ===== 1. Hero ===== */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-head">
            <span className="eyebrow"><span className="dot"></span> Early access is opening — 2026</span>
            <h1>The home for every app your business builds.</h1>
            <p className="hero-lead">
              Drop a folder or describe what you want, and get a live, shareable URL.
            </p>
          </div>
          <HeroEntry />
          <div className="hero-foot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
            </svg>
            Database, logins, AI, payments and messaging — already wired in. No servers, no config, no code.
          </div>
        </div>
      </section>

      {/* ===== Sample-apps marquee ===== */}
      <AppsMarquee />

      {/* ===== 2. The loop ===== */}
      <section className="loop">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> How it works</span>
            <h2>Create, share, change, grow.</h2>
            <p>Making the app is the easy part now. The real story is what happens after — and that’s the loop hostnsoft is built around.</p>
          </div>
          <div className="loop-grid">
            {LOOP.map((s, idx) => (
              <div className="loop-card" key={s.k}>
                <span className="loop-ic">{s.icon}</span>
                <span className="loop-step">Step {idx + 1}</span>
                <h3>{s.k}</h3>
                <p>{s.d}</p>
                {idx < LOOP.length - 1 && (
                  <span className="loop-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3. Capabilities ===== */}
      <section className="caps">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Batteries included</span>
            <h2>Everything a real business app needs — already wired in.</h2>
            <p>No API keys, no plumbing. Each app you bring gets the whole set, free.</p>
          </div>
          <div className="caps-grid">
            {CAPS.map((c) => (
              <div className="cap" key={c.t}>
                <span className="cap-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={c.i} />
                  </svg>
                </span>
                <h3>{c.t}</h3>
                <p>{c.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. App gallery ===== */}
      <section className="gallery">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Start from a real example</span>
            <h2>The apps businesses actually run on.</h2>
            <p>Pick one, make it yours in plain English, and share it with your team today.</p>
          </div>
          <div className="gallery-grid">
            {GALLERY.map((g) => (
              <div className="tile" key={g.t}>
                <div className="tile-top" style={{ ["--tc" as string]: g.c }}>
                  <div className="tile-chrome"><span></span><span></span><span></span></div>
                  <div className="tile-rows">
                    <div className="tr tr-head"></div>
                    <div className="tr"></div>
                    <div className="tr"></div>
                    <div className="tr short"></div>
                  </div>
                </div>
                <div className="tile-body">
                  <h3>{g.t}</h3>
                  <p>{g.s}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="gallery-cta">
            <GetAccessButton>Start from any of these</GetAccessButton>
          </div>
        </div>
      </section>

      {/* ===== 5. Change-with-approval (the moat) ===== */}
      <section className="moat">
        <div className="wrap moat-grid">
          <div className="moat-copy">
            <span className="eyebrow"><span className="dot"></span> The safety net</span>
            <h2>Change anything in plain English — nothing goes live without a yes.</h2>
            <p>
              Businesses change; your apps should keep up. Ask for a new field, a new step,
              a new rule. The AI proposes it on a preview and shows you exactly what changed.
            </p>
            <div className="reassure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
              </svg>
              You stay in control before any update reaches your team.
            </div>
          </div>

          <div className="review">
            <div className="review-bar">
              <span className="review-tag">Preview</span>
              <span className="review-url">notes-update.hostnsoft.com</span>
            </div>
            <div className="msg you">
              <div className="bubble">
                <div className="who">You</div>
                Add a notes field to the order form, and drop the delivery-date column.
              </div>
            </div>
            <div className="diff">
              <div className="diff-title">Here’s what will change:</div>
              <div className="diff-line add">
                <span className="sign">+</span> Added a <b>Notes</b> field to the order form
              </div>
              <div className="diff-line rem">
                <span className="sign">−</span> Removed the <b>Delivery date</b> column from the dashboard
              </div>
            </div>
            <div className="approve">
              <button className="btn approve-btn" type="button">Approve &amp; go live</button>
              <button className="btn-ghost" type="button">Discard</button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. Comparison ===== */}
      <section className="compare">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Why hostnsoft</span>
            <h2>The only place your AI‑made apps can live and grow.</h2>
            <p>No-code builders lock you into their editor. Hosting platforms are built for developers. hostnsoft is built for your whole team.</p>
          </div>
          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th></th>
                  {COMPARE.cols.map((c, i) => (
                    <th key={c} className={i === 0 ? "us" : ""}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.rows.map((r) => (
                  <tr key={r.label}>
                    <td className="row-label">{r.label}</td>
                    {r.v.map((v, i) => (
                      <td key={i} className={i === 0 ? "us" : ""}><Cell v={v} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== 7. Trust ===== */}
      <section className="trust-sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Trust &amp; safety</span>
            <h2>Your business data, handled the way you’d want.</h2>
            <p>AI plus your business data is worth being careful with. So we made the careful choices the defaults.</p>
          </div>
          <div className="trust-grid">
            {TRUST.map((t) => (
              <div className="trust-card" key={t.t}>
                <span className="trust-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={t.i} />
                  </svg>
                </span>
                <div>
                  <h3>{t.t}</h3>
                  <p>{t.s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 8. Pricing hint + CTA ===== */}
      <section className="final">
        <div className="wrap">
          <div className="final-card">
            <span className="price-hint">One simple plan per business · generous limits · no per-seat surprises</span>
            <h2>Your business will make more apps. Give them one home.</h2>
            <p>AI makes it easy to create useful tools. hostnsoft makes them easy to share, keep safe, and improve — as a team.</p>
            <GetAccessButton />
            <div className="cta-sub">Be among the first businesses to put AI‑made apps to work.</div>
          </div>
        </div>
      </section>

      {/* ===== 9. FAQ ===== */}
      <section className="faq">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Questions</span>
            <h2>Good questions, answered.</h2>
          </div>
          <div className="faq-list">
            {FAQ.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary>
                  {f.q}
                  <span className="faq-plus" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-brand">
              <Logo markSize={34} />
              <p className="footer-tag">
                The home for every app your business builds. Drop a folder or describe
                what you want, and get a live, shareable URL — with database, logins, AI,
                payments and messaging built in.
              </p>
              <div className="footer-social">
                <a href="#" aria-label="hostnsoft on X" title="X">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
                </a>
                <a href="#" aria-label="hostnsoft on LinkedIn" title="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" /></svg>
                </a>
                <a href="#" aria-label="hostnsoft on GitHub" title="GitHub">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.41 7.86 10.94.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.08.78 2.18 0 1.57-.02 2.84-.02 3.23 0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" /></svg>
                </a>
                <a href="mailto:hello@hostnsoft.com" aria-label="Email hostnsoft" title="Email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="0" /><path d="m3 6 9 7 9-7" /></svg>
                </a>
              </div>
            </div>

            <nav className="footer-cols" aria-label="Footer">
              <div className="footer-col">
                <h4>Product</h4>
                <a href="#">How it works</a>
                <a href="#">Capabilities</a>
                <a href="#">App gallery</a>
                <a href="#">Change approval</a>
                <a href="#">Pricing</a>
              </div>
              <div className="footer-col">
                <h4>Use cases</h4>
                <a href="#">Order Tracker</a>
                <a href="#">Appointment Booking</a>
                <a href="#">Lead Intake</a>
                <a href="#">Expense Approvals</a>
                <a href="#">Customer Feedback</a>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <a href="#">About us</a>
                <a href="#">Careers</a>
                <a href="#">Blog</a>
                <a href="mailto:hello@hostnsoft.com">Contact</a>
              </div>
              <div className="footer-col">
                <h4>Trust &amp; legal</h4>
                <a href="#">Security</a>
                <a href="#">Data export</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </nav>
          </div>

          <div className="footer-bottom">
            <span className="footer-copy">© 2026 hostnsoft — Hosting and Software. All rights reserved.</span>
            <div className="footer-meta">
              <span className="footer-badge"><span className="dot"></span> Early access · 2026</span>
              <a href="#">Status</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </EarlyAccessProvider>
  );
}
