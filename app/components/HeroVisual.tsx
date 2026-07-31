"use client";

import { useEffect, useState } from "react";

const TARGET = "orders.yourbusiness.com";

export function HeroVisual() {
  const [text, setText] = useState("");

  useEffect(() => {
    let i = 0;
    let dir = 1;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setText(TARGET.slice(0, i));
      if (dir > 0) {
        i++;
        if (i > TARGET.length) {
          dir = -1;
          timer = setTimeout(tick, 2600);
          return;
        }
      } else {
        i--;
        if (i < 0) {
          i = 0;
          dir = 1;
          timer = setTimeout(tick, 700);
          return;
        }
      }
      timer = setTimeout(tick, dir > 0 ? 90 : 45);
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
              <div className="t">Order Tracker</div>
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
            <span className="link-url">{text}</span>
            <span className="cursor"></span>
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
