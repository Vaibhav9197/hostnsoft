import { AppsMarquee } from "./components/AppsMarquee";
import { EarlyAccessProvider, GetAccessButton } from "./components/EarlyAccess";
import { Header } from "./components/Header";
import { Logo } from "./components/Logo";

/* ---------- Section data ---------- */

const LOOP = [
  {
    k: "Bring your app",
    d: "Any language, any framework, built by any tool. Read the port from PORT and bind to 0.0.0.0 — that’s the only requirement.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z" /><path d="M3 7l9 4 9-4M12 11v10" />
      </svg>
    ),
  },
  {
    k: "Deploy",
    d: "Run one command, or just tell your AI agent to ship it. No Dockerfile, no YAML, no config files to write.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V4m0 0-4 4m4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
  },
  {
    k: "Auto‑build",
    d: "hostnsoft detects your language and framework and builds the image itself. Nothing for you to configure.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="1" /><path d="M7 9l3 3-3 3M13 15h4" />
      </svg>
    ),
  },
  {
    k: "Go live",
    d: "Your app is reachable at a generated URL in seconds — with a database and persistent storage already attached.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
    ),
  },
];

const CAPS = [
  { t: "No Dockerfile", s: "hostnsoft detects your stack and builds the image for you. Delete the Dockerfile — you won’t need one.", i: "M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10" },
  { t: "Database included", s: "An embedded Postgres (PGlite) ships with every app. No provisioning, connection strings, or credentials.", i: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" },
  { t: "Persistent storage", s: "Write under DATA_DIR and your data survives every redeploy. Nothing to mount or back up by hand.", i: "M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 0v5h7V4M8 13h8v6H8z" },
  { t: "Automatic builds", s: "Hand over your source; hostnsoft builds and ships it. No CI pipeline to wire up.", i: "M13 3 4 14h6l-1 7 9-11h-6l1-7Z" },
  { t: "Live URL out of the box", s: "Every deploy gets a generated, shareable HTTPS URL the moment the app is up.", i: "M9 15l6-6M10.5 7.5l1-1a4 4 0 0 1 5.7 5.7l-1 1M13.5 16.5l-1 1a4 4 0 0 1-5.7-5.7l1-1" },
  { t: "Deploy from your AI agent", s: "Install the hostnsoft skill and just say “deploy this.” It packages, ships, and verifies for you.", i: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 4 3 3-3 3m6 0h4" },
  { t: "Memory that scales with you", s: "Add a database and hostnsoft allocates more memory automatically — no dials to turn.", i: "M6 4h12v4H6zM4 8h16v12H4zM8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" },
  { t: "Safe redeploys", s: "Ship a new version any time. Your data, storage, and URL stay put across deploys.", i: "M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" },
];

const COMPARE = {
  cols: ["hostnsoft", "Container PaaS", "Serverless", "Self‑managed VPS", "Static hosts"],
  rows: [
    { label: "Deploy with no Dockerfile", v: ["yes", "part", "part", "no", "yes"] },
    { label: "Database included, zero config", v: ["yes", "no", "no", "no", "no"] },
    { label: "Persistent storage built in", v: ["yes", "part", "no", "yes", "no"] },
    { label: "Deploy straight from your AI agent", v: ["yes", "no", "no", "no", "no"] },
    { label: "Runs a real server, not just static files", v: ["yes", "yes", "part", "yes", "no"] },
    { label: "Live HTTPS URL on the first deploy", v: ["yes", "yes", "yes", "part", "yes"] },
  ],
};

const TRUST = [
  { t: "Your data is yours", s: "Everything lives in your app’s DATA_DIR. Export it any time. No lock‑in, no hostage‑taking.", i: "M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4ZM9 12l2 2 4-4" },
  { t: "Verified, not just accepted", s: "Every deploy is checked to be actually running and reachable before it’s reported as done.", i: "M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" },
  { t: "Redeploys never lose data", s: "Your database and uploaded files persist across every version you ship. Rollbacks stay safe.", i: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" },
  { t: "Backed up automatically", s: "Your app and its data are backed up so a bad day isn’t a lost one.", i: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" },
];

const FAQ = [
  {
    q: "What do I need to change in my app?",
    a: "Almost nothing. Read the listening port from the PORT environment variable and bind to 0.0.0.0 instead of localhost. Don’t include a Dockerfile — hostnsoft detects your language and framework and builds the image for you.",
  },
  {
    q: "What can I deploy?",
    a: "Any app that runs as a web server — Node, Python, Go and more — whether you hand‑wrote it or generated it with an AI tool like Claude, ChatGPT, Bolt, v0 or Lovable. hostnsoft auto‑detects the language and framework at deploy time.",
  },
  {
    q: "How does the database work?",
    a: "Every app can use an embedded Postgres (PGlite) with zero setup — no provisioning, connection strings or credentials. Point it at the DATA_DIR path hostnsoft provides and it persists across redeploys. It’s a single‑instance embedded database, ideal for apps that run as one instance.",
  },
  {
    q: "How do I deploy?",
    a: "Install the hostnsoft skill in Claude Code, Cowork or your terminal and say “deploy this” — it packages your app, ships it, and verifies it’s live before handing you the URL. Prefer to do it yourself? Run one command against the deploy API.",
  },
  {
    q: "Does my data survive a redeploy?",
    a: "Yes. Anything written under DATA_DIR — your database and uploaded files — persists across every deploy, so shipping a new version never wipes your data. Your generated URL stays the same too.",
  },
  {
    q: "When can I start?",
    a: "We’re onboarding early‑access accounts now, ahead of general availability later this year. Join the list and we’ll reach out with an invite and your deploy token.",
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
            <h1>Deploy any app<br /><span className="hl">Get a live URL</span></h1>
            <p className="hero-lead">
              Managed hosting that builds your app for you — no Dockerfile, no config. Ship it from your terminal or your AI agent.
            </p>
          </div>
          <div className="hero-cta">
            <GetAccessButton />
          </div>
          <div className="hero-foot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
            </svg>
            Automatic builds, a database and persistent storage — already wired in. No servers, no Dockerfile, no config.
          </div>
        </div>
      </section>

      {/* ===== Live-apps marquee ===== */}
      <AppsMarquee />

      {/* ===== 2. How it works ===== */}
      <section className="loop">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> How it works</span>
            <h2>From your code to a live URL, in four steps.</h2>
            <p>Point your app at hostnsoft, deploy, and let it handle the build, the server, and the database. No infrastructure to manage.</p>
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
            <h2>Everything hosting an app needs — already wired in.</h2>
            <p>No Dockerfile, no CI, no database to provision. Bring the code; hostnsoft handles the rest.</p>
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

      {/* ===== 4. The deploy experience ===== */}
      <section className="moat">
        <div className="wrap moat-grid">
          <div className="moat-copy">
            <span className="eyebrow"><span className="dot"></span> The deploy experience</span>
            <h2>Ship it with one command — or just ask your agent.</h2>
            <p>
              Install the hostnsoft skill in Claude Code, Cowork or your terminal. Say
              “deploy this,” and it packages your app, ships it, and verifies it’s
              actually running before it hands you the URL.
            </p>
            <div className="reassure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
              </svg>
              A deploy is confirmed live — not just accepted — before it’s called done.
            </div>
          </div>

          <div className="review">
            <div className="review-bar">
              <span className="review-tag">Terminal</span>
              <span className="review-url">~/order-tracker</span>
            </div>
            <div className="msg you">
              <div className="bubble">
                <div className="who">You</div>
                Deploy this to hostnsoft.
              </div>
            </div>
            <div className="diff">
              <div className="diff-title">hostnsoft deploy</div>
              <div className="diff-line">
                <span className="sign">›</span> Packaged order-tracker — no Dockerfile needed
              </div>
              <div className="diff-line">
                <span className="sign">›</span> Detected <b>Node.js</b> · building image
              </div>
              <div className="diff-line add">
                <span className="sign">✓</span> Deployed <b>v2026.08.26</b>
              </div>
              <div className="diff-line add">
                <span className="sign">✓</span> Verified running · <b>200 OK</b>
              </div>
              <div className="diff-line url">
                <span className="sign">↗</span> <a href="#">https://order-tracker.hostnsoft.com</a>
              </div>
            </div>
            <div className="approve">
              <button className="btn approve-btn" type="button">Open live URL</button>
              <button className="btn-ghost" type="button">Redeploy</button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. Comparison ===== */}
      <section className="compare">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Why hostnsoft</span>
            <h2>The simplest way to put a real app online.</h2>
            <p>Container platforms want a Dockerfile. Serverless won’t run a stateful server. A VPS makes you the sysadmin. hostnsoft just takes your code and runs it.</p>
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

      {/* ===== 6. Trust ===== */}
      <section className="trust-sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow"><span className="dot"></span> Trust &amp; safety</span>
            <h2>Your app and its data, handled the way you’d want.</h2>
            <p>Running someone’s app and data is worth being careful with. So we made the careful choices the defaults.</p>
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

      {/* ===== 7. Pricing hint + CTA ===== */}
      <section className="final">
        <div className="wrap">
          <div className="final-card">
            <span className="price-hint">One simple plan per app · generous limits · no per-seat surprises</span>
            <h2>Stop wrestling with servers. Just ship.</h2>
            <p>hostnsoft builds, hosts, and keeps your app running — so you can spend your time on the app, not the infrastructure.</p>
            <GetAccessButton />
            <div className="cta-sub">Be among the first to deploy on hostnsoft.</div>
          </div>
        </div>
      </section>

      {/* ===== 8. FAQ ===== */}
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
                Managed hosting for any app. Deploy from your terminal or your AI
                agent, and get a live URL with a database and persistent storage
                built in — no Dockerfile, no config, no servers to manage.
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
                <a href="#">Deploy guide</a>
                <a href="#">Why hostnsoft</a>
                <a href="#">Pricing</a>
              </div>
              <div className="footer-col">
                <h4>Deploy from</h4>
                <a href="#">Claude Code</a>
                <a href="#">Cowork</a>
                <a href="#">Terminal / CLI</a>
                <a href="#">Deploy API</a>
                <a href="#">CI pipelines</a>
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
