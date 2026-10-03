import { GraduationCap, ListTodo, Palette, Receipt, Stethoscope } from "lucide-react";

/* The hero cards on /use-cases: six small apps drawn as real app windows,
   each on its own embarko.app link. On load every card goes Deploying → Live
   (the one thing Embarko does), and hovering one makes the app do its job —
   a task gets ticked, a patient goes in, a new job lands on a resume. Decorative only:
   hidden from assistive tech; the headline and list carry the meaning. */

type Swap = { before: string; after: string };

function SwapText({ before, after }: Swap) {
  return (
    <span className="uc-swap">
      <span className="uc-before">{before}</span>
      <span className="uc-after">{after}</span>
    </span>
  );
}

function Check() {
  return (
    <span className="uc-check">
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* Grows open on hover. */
function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <div className="uc-reveal">
      <div>{children}</div>
    </div>
  );
}

function Todo() {
  const rows: Array<[string, "done" | "next" | "open"]> = [
    ["Send the weekly report", "done"],
    ["Book team lunch", "done"],
    ["Renew the domain", "next"],
    ["Order printer ink", "open"],
  ];
  return (
    <ul className="uc-list">
      {rows.map(([text, state]) => (
        <li key={text} className={`uc-todo is-${state}`}>
          <Check />
          <span className="uc-txt">{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Homework() {
  const rows: Array<[string, "done" | "next" | "open"]> = [
    ["Aarav", "done"],
    ["Meera", "done"],
    ["Kabir", "next"],
  ];
  return (
    <>
      <div className="uc-progress">
        <span className="uc-meter">
          <i />
        </span>
        <span className="uc-amt">
          <SwapText before="18/24" after="19/24" />
        </span>
      </div>
      <ul className="uc-list">
        {rows.map(([name, state]) => (
          <li key={name} className={`uc-todo is-${state}`}>
            <Check />
            <span className="uc-txt uc-plain">{name}</span>
            <span className="uc-note">
              {state === "next" ? <SwapText before="Not yet" after="Handed in" /> : "Handed in"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Portfolio() {
  /* Five finished projects and one empty slot that fills on hover. */
  const tones = ["#ffd166", "#8ecbff", "#ff9966", "#a8e28f", "#8fe3d2"];
  return (
    <div className="uc-shots">
      {tones.map((tone) => (
        <span key={tone} className="uc-shot" style={{ background: tone }}>
          <i />
        </span>
      ))}
      <span className="uc-shot uc-shot-new">
        <b>+</b>
        <span className="uc-shot-fill">
          <i />
        </span>
      </span>
    </div>
  );
}

/* Riya's profile picture: a flat drawn portrait, not a photo of a real person.
   Messy top bun, round glasses, black blazer over a white tee, gold hoops. */
function RiyaAvatar() {
  const HAIR = "#1d1512";
  const SKIN = "#d39a76";
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <rect width="80" height="80" fill="#c8efe5" />
      <circle cx="58" cy="20" r="22" fill="#b3e7da" />
      <g transform="translate(-6 -1) scale(1.15)">
      {/* top bun */}
      <circle cx="40" cy="14" r="7.5" fill={HAIR} />
      <path d="M35 12c2-3 7-4 10-1" fill="none" stroke="#3a2a22" strokeWidth="1.2" strokeLinecap="round" />
      {/* blazer, tee, neck */}
      <path d="M8 80c2-16 14-23 32-23s30 7 32 23z" fill="#1a1916" />
      <path d="M32 57l8 15 8-15z" fill="#fffdf7" />
      <path d="M32 57l-5 9 8 4M48 57l5 9-8 4" fill="none" stroke="#3a3833" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M34 45h12v10c0 3-3 5-6 5s-6-2-6-5z" fill="#bd8460" />
      {/* face */}
      <ellipse cx="40" cy="37" rx="13" ry="15" fill={SKIN} />
      <circle cx="30.5" cy="43.5" r="2.2" fill="#e5826b" opacity=".35" />
      <circle cx="49.5" cy="43.5" r="2.2" fill="#e5826b" opacity=".35" />
      {/* hair pulled back with a middle part, a few loose strands */}
      <path d="M27 35c-1-11 5-16 13-16s14 5 13 16c-3-6-7-9-12-10l-1 3-1-3c-5 1-9 4-12 10z" fill={HAIR} />
      <path d="M27.5 33c-2 4-2 9-.5 13M52.5 33c2 4 2 9 .5 13" fill="none" stroke={HAIR} strokeWidth="1.3" strokeLinecap="round" />
      {/* glasses */}
      <rect x="29" y="34" width="9.5" height="7.5" rx="3.6" fill="#fffdf7" fillOpacity=".25" stroke="#1a1916" strokeWidth="1.5" />
      <rect x="41.5" y="34" width="9.5" height="7.5" rx="3.6" fill="#fffdf7" fillOpacity=".25" stroke="#1a1916" strokeWidth="1.5" />
      <path d="M38.5 37.2h3" stroke="#1a1916" strokeWidth="1.5" />
      <circle cx="33.8" cy="38" r="1.1" fill={HAIR} />
      <circle cx="46.2" cy="38" r="1.1" fill={HAIR} />
      <path d="M36.5 46c2 1.6 5 1.6 7 0" fill="none" stroke="#8a4a36" strokeWidth="1.4" strokeLinecap="round" />
      {/* gold hoops */}
      <circle cx="26.6" cy="45" r="2.2" fill="none" stroke="#f0a800" strokeWidth="1.3" />
      <circle cx="53.4" cy="45" r="2.2" fill="none" stroke="#f0a800" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

function Resume() {
  const job = (role: string, place: string, years: string) => (
    <div className="uc-job">
      <span className="uc-txt">
        <b>{role}</b> · {place}
      </span>
      <span className="uc-num">{years}</span>
    </div>
  );
  return (
    <>
      <span className="uc-label">Experience</span>
      <Reveal>{job("Lead designer", "Northwind", "2026–")}</Reveal>
      {job("Product designer", "Acme", "2023–26")}
      {job("UI designer", "Studio Loop", "2021–23")}
      <span className="uc-label">Skills</span>
      <div className="uc-skills">
        <span>Figma</span>
        <span>Research</span>
        <span>Prototyping</span>
      </div>
    </>
  );
}

function Clinic() {
  return (
    <ul className="uc-list">
      <li className="uc-ticket">
        <span className="uc-num">9:30</span>
        <span className="uc-txt">Anita Rao</span>
        <span className="uc-chip is-done">Seen</span>
      </li>
      <li className="uc-ticket">
        <span className="uc-num">10:00</span>
        <span className="uc-txt">Mr. Dsouza</span>
        <span className="uc-swap">
          <span className="uc-before uc-chip is-open">Waiting</span>
          <span className="uc-after uc-chip is-done">In room</span>
        </span>
      </li>
      <li className="uc-ticket">
        <span className="uc-num">10:30</span>
        <span className="uc-txt">Leela Nair</span>
        <span className="uc-chip is-doing">Booked</span>
      </li>
    </ul>
  );
}

function Expenses() {
  const row = (label: string, amount: string) => (
    <div className="uc-expense">
      <span className="uc-txt">{label}</span>
      <span className="uc-amt">{amount}</span>
    </div>
  );
  return (
    <>
      <Reveal>{row("Printer ink", "36.00")}</Reveal>
      {row("Team lunch", "84.00")}
      {row("Cab to client", "22.50")}
      <div className="uc-expense uc-total">
        <span>Total</span>
        <span className="uc-amt">
          <SwapText before="106.50" after="142.50" />
        </span>
      </div>
    </>
  );
}

type App = {
  url: string;
  name: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  /** The icon is a profile picture: shown big and square. */
  photo?: boolean;
  body: React.ReactNode;
};

/* Order matters: the phone layout shows the first two. */
const APPS: App[] = [
  { url: "todo.embarko.app", name: "Todo", sub: <SwapText before="2 left today" after="1 left today" />, icon: <ListTodo />, body: <Todo /> },
  { url: "clinic.embarko.app", name: "Appointments", sub: <SwapText before="1 waiting" after="No one waiting" />, icon: <Stethoscope />, body: <Clinic /> },
  { url: "class7b.embarko.app", name: "Homework", sub: "Class 7B · due Friday", icon: <GraduationCap />, body: <Homework /> },
  { url: "aisha.embarko.app", name: "Portfolio", sub: <SwapText before="Aisha · 5 projects" after="Aisha · 6 projects" />, icon: <Palette />, body: <Portfolio /> },
  { url: "riya.embarko.app", name: "Riya Sharma", sub: "Resume · Product designer", icon: <RiyaAvatar />, photo: true, body: <Resume /> },
  { url: "expenses.embarko.app", name: "Expenses", sub: "October", icon: <Receipt />, body: <Expenses /> },
];

export function AppCards() {
  return (
    <ul className="uc-apps" aria-hidden="true">
      {APPS.map((app, i) => (
        <li key={app.url} className={`uc-app uc-app-${i + 1}`}>
          <div className="uc-card">
            <div className="uc-bar">
              <span className="uc-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="uc-url">{app.url}</span>
              <span className="uc-state">
                <span className="uc-deploying">
                  <i className="uc-spin" />
                  Deploying
                </span>
                <span className="uc-live">
                  <i />
                  Live
                </span>
              </span>
            </div>
            <div className="uc-head">
              <span className={app.photo ? "uc-icon uc-photo" : "uc-icon"}>{app.icon}</span>
              <span className="uc-title">
                <b>{app.name}</b>
                <small>{app.sub}</small>
              </span>
            </div>
            <div className="uc-body">{app.body}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
