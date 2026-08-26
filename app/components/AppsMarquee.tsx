import type { ReactNode } from "react";

/**
 * Horizontal marquee of sample-app "screenshots".
 * Each thumbnail is an inline SVG mini-UI (no external images) themed to
 * its app colour, so it stays crisp and needs no network/CDN.
 */

type App = { id: string; title: string; sub: string; c: string };

const APPS: App[] = [
  { id: "order", title: "Order Tracker", sub: "Orders & status", c: "#86F09B" },
  { id: "expense", title: "Expense Approvals", sub: "Submit & approve", c: "#6BE8C0" },
  { id: "lead", title: "Lead Intake", sub: "Capture leads", c: "#C7F58A" },
  { id: "booking", title: "Appointment Booking", sub: "Pick a slot", c: "#7BC8F0" },
  { id: "checklist", title: "Employee Checklist", sub: "Daily tasks", c: "#F0D06E" },
  { id: "feedback", title: "Customer Feedback", sub: "Ratings & notes", c: "#B79BF0" },
  { id: "inventory", title: "Inventory Log", sub: "Stock in & out", c: "#F0A18A" },
  { id: "complaint", title: "Complaint Desk", sub: "Log & resolve", c: "#8AF0D0" },
  { id: "sales", title: "Sales Leaderboard", sub: "Who’s ahead", c: "#F0A6C4" },
];

/* light "app screen" palette so shots pop on the dark cards */
const SCREEN = "#F4F6F5";
const BAR_TOP = "#EAEDEB";
const CARD = "#FFFFFF";
const LINE = "#E2E7E4";
const MUTE = "#CFD6D1";
const MUTE2 = "#DCE2DE";
const TEXT = "#4A524D";

function Thumb({ children }: { children: ReactNode }) {
  return (
    <svg className="mq-thumb" viewBox="0 0 280 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <rect width="280" height="150" fill={SCREEN} />
      <rect width="280" height="26" fill={BAR_TOP} />
      <circle cx="16" cy="13" r="3.4" fill={MUTE} />
      <circle cx="28" cy="13" r="3.4" fill={MUTE} />
      <circle cx="40" cy="13" r="3.4" fill={MUTE} />
      <rect x="94" y="8" width="92" height="10" fill={MUTE2} />
      {children}
    </svg>
  );
}

function Motif({ id, c }: { id: string; c: string }) {
  switch (id) {
    case "order":
      return (
        <Thumb>
          <rect x="16" y="38" width="96" height="9" fill={TEXT} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0 ${58 + i * 28})`}>
              <rect x="16" y="0" width="248" height="22" fill={CARD} stroke={LINE} />
              <rect x="26" y="7" width="70" height="8" fill={MUTE} />
              <rect x="200" y="5" width="54" height="12" fill={c} />
            </g>
          ))}
        </Thumb>
      );
    case "expense":
      return (
        <Thumb>
          <rect x="16" y="38" width="248" height="44" fill={CARD} stroke={LINE} />
          <rect x="26" y="48" width="60" height="8" fill={MUTE} />
          <rect x="26" y="62" width="96" height="12" fill={TEXT} />
          <text x="238" y="70" fontSize="16" fontWeight="700" fill={c} textAnchor="end" fontFamily="Inter, sans-serif">$420</text>
          <rect x="16" y="94" width="120" height="26" fill={c} />
          <rect x="146" y="94" width="118" height="26" fill={CARD} stroke={MUTE} />
          <rect x="150" y="104" width="70" height="7" fill={MUTE} />
        </Thumb>
      );
    case "lead":
      return (
        <Thumb>
          <rect x="16" y="38" width="80" height="9" fill={TEXT} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x="16" y={56 + i * 22} width="248" height="16" fill={CARD} stroke={LINE} />
          ))}
          <rect x="24" y={60} width="60" height="8" fill={MUTE} />
          <rect x="24" y={82} width="90" height="8" fill={MUTE} />
          <rect x="24" y={104} width="70" height="8" fill={MUTE} />
          <rect x="16" y="126" width="90" height="18" fill={c} />
        </Thumb>
      );
    case "booking":
      return (
        <Thumb>
          <rect x="16" y="36" width="70" height="9" fill={TEXT} />
          {Array.from({ length: 21 }).map((_, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            const on = i === 10;
            return (
              <rect
                key={i}
                x={16 + col * 36}
                y={54 + row * 30}
                width="30"
                height="24"
                fill={on ? c : CARD}
                stroke={on ? c : LINE}
              />
            );
          })}
        </Thumb>
      );
    case "checklist":
      return (
        <Thumb>
          <rect x="16" y="38" width="86" height="9" fill={TEXT} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(0 ${58 + i * 22})`}>
              <rect x="16" y="0" width="14" height="14" fill={i < 2 ? c : CARD} stroke={i < 2 ? c : MUTE} />
              {i < 2 && <path d="M19 7 l3 3 l6 -6" stroke="#07130B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              <rect x="38" y="3" width={150 - i * 20} height="8" fill={MUTE} />
            </g>
          ))}
        </Thumb>
      );
    case "feedback":
      return (
        <Thumb>
          <g transform="translate(16 44)">
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                transform={`translate(${i * 30} 0)`}
                d="M11 0 l3.4 6.9 l7.6 1.1 l-5.5 5.4 l1.3 7.6 l-6.8 -3.6 l-6.8 3.6 l1.3 -7.6 l-5.5 -5.4 l7.6 -1.1 z"
                fill={i < 4 ? c : CARD}
                stroke={i < 4 ? c : MUTE}
                strokeWidth="1.2"
              />
            ))}
          </g>
          {[0, 1, 2].map((i) => (
            <rect key={i} x="16" y={88 + i * 16} width={i === 2 ? 150 : 248} height="8" fill={MUTE} />
          ))}
        </Thumb>
      );
    case "inventory":
      return (
        <Thumb>
          <rect x="16" y="38" width="90" height="9" fill={TEXT} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(0 ${58 + i * 20})`}>
              <rect x="16" y="0" width="70" height="8" fill={MUTE} />
              <rect x="100" y="0" width="164" height="8" fill={MUTE2} />
              <rect x="100" y="0" width={40 + i * 40} height="8" fill={c} />
            </g>
          ))}
        </Thumb>
      );
    case "complaint":
      return (
        <Thumb>
          <rect x="16" y="38" width="84" height="9" fill={TEXT} />
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(0 ${56 + i * 42})`}>
              <rect x="16" y="0" width="248" height="34" fill={CARD} stroke={LINE} />
              <rect x="16" y="0" width="4" height="34" fill={c} />
              <rect x="28" y="8" width="120" height="8" fill={MUTE} />
              <rect x="28" y="20" width="80" height="6" fill={MUTE2} />
              <rect x="212" y="11" width="44" height="12" fill={c} />
            </g>
          ))}
        </Thumb>
      );
    case "sales":
      return (
        <Thumb>
          <rect x="16" y="38" width="92" height="9" fill={TEXT} />
          <line x1="16" y1="132" x2="264" y2="132" stroke={LINE} />
          {[46, 78, 60, 108, 90].map((h, i) => (
            <rect key={i} x={26 + i * 48} y={132 - h} width="30" height={h} fill={i === 3 ? c : MUTE2} />
          ))}
        </Thumb>
      );
    default:
      return <Thumb>{null}</Thumb>;
  }
}

function Card({ app }: { app: App }) {
  return (
    <div className="mq-card">
      <Motif id={app.id} c={app.c} />
      <div className="mq-meta">
        <h4>{app.title}</h4>
        <span>{app.sub}</span>
      </div>
    </div>
  );
}

export function AppsMarquee() {
  // duplicate the set so the -50% translate loops seamlessly
  const loop = [...APPS, ...APPS];
  return (
    <section className="marquee-sec" aria-label="Apps running on hostnsoft">
      <div className="marquee-kicker">Apps deployed and running on hostnsoft</div>
      <div className="marquee">
        <div className="marquee-track">
          {loop.map((app, i) => (
            <Card key={`${app.id}-${i}`} app={app} />
          ))}
        </div>
      </div>
    </section>
  );
}
