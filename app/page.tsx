import { EarlyAccessProvider, GetAccessButton } from "./components/EarlyAccess";
import { Header } from "./components/Header";
import { HeroVisual } from "./components/HeroVisual";

export default function Home() {
  return (
    <EarlyAccessProvider>
      <Header />

      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow"><span className="dot"></span> Early access is opening</span>
            <h1>Your AI&#8209;made app deserves a real home.</h1>
            <p className="hero-lead">
              Get a live link, share it with your people, and keep every business app in one simple place.
            </p>
            <GetAccessButton />
            <div className="cta-sub">Be among the first businesses to put AI&#8209;made apps to work.</div>
            <div className="trust">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l2 2 4-4" />
                <path d="M3 6h18" />
                <path d="M9 6h12" />
                <path d="M13 12h8M13 18h8M3 18l2 2 4-4" />
              </svg>
              Made one useful app? Give it a home your whole team can use.
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* ===== Three outcomes ===== */}
      <section>
        <div className="wrap">
          <div className="sec-head">
            <h2>Everything your business app needs to become useful.</h2>
          </div>
          <div className="cards">
            <div className="card">
              <span className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                  <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
                </svg>
              </span>
              <h3>Get a live link</h3>
              <p>Give your app a real web address that is ready to open and share.</p>
            </div>
            <div className="card">
              <span className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <h3>Share with the right people</h3>
              <p>Invite your team or customers, and choose who can use each app.</p>
            </div>
            <div className="card">
              <span className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              <h3>Keep every app together</h3>
              <p>Give your growing collection of business apps one simple, easy&#8209;to&#8209;find home.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Change requests ===== */}
      <section className="change">
        <div className="wrap change-grid">
          <div>
            <h2>Need to change something later? Just ask.</h2>
            <p>
              Businesses change. Your apps should keep up. Ask for a new field, a new step, or a better way of
              working—in everyday language.
            </p>
            <div className="reassure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              You stay in control before any update goes live.
            </div>
          </div>
          <div className="chat">
            <div className="msg you">
              <div className="bubble">
                <div className="who">You</div>
                Only managers should be able to approve these requests.
              </div>
            </div>
            <div className="msg bot">
              <div className="bubble">
                <div className="who">AppHome</div>
                Your update is ready to review.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Final conversion ===== */}
      <section className="final">
        <div className="wrap">
          <div className="final-card">
            <h2>Your business will create more apps. Keep them in one trusted place.</h2>
            <p>AI makes it easier to create useful tools. AppHome makes them easy to share, find, and improve.</p>
            <GetAccessButton />
            <div className="cta-sub">Be among the first businesses to put AI&#8209;made apps to work.</div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer>
        <div className="wrap foot">
          <div>
            <div className="brand"><span className="logo"><span></span></span> AppHome</div>
            <div className="tag">The home for your business apps.</div>
          </div>
          <div className="foot-links">
            <a href="mailto:hello@apphome.example">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </footer>
    </EarlyAccessProvider>
  );
}
