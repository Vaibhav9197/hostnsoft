"use client";

import { useEffect, useState } from "react";

// Each business pairs an example app with its live domain.
// "https://" stays fixed on screen — only the (name + TLD) types in and out,
// and the "Your app" card swaps to match the current business.
const EXAMPLES = [
  { app: "Order Tracker", domain: "yourcafe.com" },
  { app: "Customer Portal", domain: "yourboutique.in" },
  { app: "Booking Tool", domain: "yourrestaurant.org" },
  { app: "Quote Calculator", domain: "yourbakery.shop" },
  { app: "Team Dashboard", domain: "yourstudio.co" },
];

export function HeroVisual() {
  const [text, setText] = useState("");
  const [biz, setBiz] = useState(0); // which business the card shows

  useEffect(() => {
    let w = 0; // which domain
    let i = 0; // characters shown
    let dir = 1; // 1 = typing, -1 = deleting
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const target = EXAMPLES[w].domain;
      setText(target.slice(0, i));
      if (dir > 0) {
        i++;
        if (i > target.length) {
          dir = -1;
          timer = setTimeout(tick, 1900); // pause on the full domain
          return;
        }
      } else {
        i--;
        if (i < 0) {
          i = 0;
          dir = 1;
          w = (w + 1) % EXAMPLES.length; // advance to the next business
          setBiz(w); // swap the app card to match
          timer = setTimeout(tick, 500);
          return;
        }
      }
      timer = setTimeout(tick, dir > 0 ? 95 : 45);
    };

    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="stage" aria-hidden="true">
      <div className="flow-track">
        <div className="flow-step">
          <span className="flow-label">Your app</span>
          <div className="card-app">
            <span className="app-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 4v5" />
              </svg>
            </span>
            <div>
              <div className="t" key={biz}>{EXAMPLES[biz].app}</div>
              <div className="s">Made with AI &middot; ready to go</div>
            </div>
          </div>
        </div>

        <span className="arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>

        <div className="flow-step">
          <span className="flow-label">Your live link</span>
          <div className="link-pill">
            <span className="live"></span>
            <span className="link-url">
              <span className="scheme">https://</span>
              {text}
              <span className="cursor"></span>
            </span>
          </div>
        </div>

        <span className="arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>

        <div className="flow-step">
          <span className="flow-label">Your team</span>
          <div className="team">
            <div className="avatars">
              <span className="av">M</span>
              <span className="av">J</span>
              <span className="av">S</span>
              <span className="av">R</span>
              <span className="av more">+6</span>
            </div>
            <span className="cap">Invited &amp; ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
