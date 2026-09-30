/* Flat poster art for the /pages hero cards, one per kind of event — the
   Luma idea (every event has a picture) drawn in Embarko's calm palette.
   Each is a 120×90 SVG: its own tone as the ground, warm ink, off-white,
   and a couple of accents. Decorative only; the card's label names it. */

const INK = "#1a1916";
const W = "#fffdf7";

type Art = { bg: string; body: React.ReactNode };

const ART: Record<string, Art> = {
  Hackathon: {
    bg: "#ffd166",
    body: (
      <>
        {/* confetti */}
        <rect x="14" y="16" width="6" height="3" rx="1" fill="#ff6a2b" transform="rotate(-25 17 17)" />
        <rect x="96" y="14" width="6" height="3" rx="1" fill="#1f8ef1" transform="rotate(30 99 15)" />
        <rect x="22" y="62" width="5" height="3" rx="1" fill="#12b39a" transform="rotate(40 24 63)" />
        <rect x="98" y="58" width="6" height="3" rx="1" fill="#ff3d5a" transform="rotate(-35 101 59)" />
        <circle cx="86" cy="26" r="2" fill="#3fb52a" />
        <circle cx="30" cy="34" r="2" fill="#4f6bff" />
        {/* trophy */}
        <path d="M44 20h32v14c0 10-7 17-16 17s-16-7-16-17z" fill={W} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M44 25h-6c0 8 3 12 8 13M76 25h6c0 8-3 12-8 13" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60 51v10M50 70h20l-3-9H53z" fill={W} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M55 30l3 3 6-7" fill="none" stroke="#e09a00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  "Game jam": {
    bg: "#8ecbff",
    body: (
      <>
        {/* pixel ground */}
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={i * 10} y="72" width="10" height="18" fill={i % 2 ? "#5fb0f5" : "#72bbf8"} />
        ))}
        <rect x="12" y="14" width="6" height="6" fill={W} />
        <rect x="18" y="14" width="6" height="6" fill={W} />
        <rect x="100" y="22" width="6" height="6" fill={W} />
        {/* controller */}
        <path d="M34 36c0-5 4-8 9-8h34c5 0 9 3 9 8l5 22c1 6-6 9-10 4l-6-8H45l-6 8c-4 5-11 2-10-4z" fill={INK} />
        <rect x="42" y="38" width="12" height="4" rx="1" fill={W} />
        <rect x="46" y="34" width="4" height="12" rx="1" fill={W} />
        <circle cx="74" cy="37" r="3" fill="#ffd166" />
        <circle cx="80" cy="43" r="3" fill="#ff6a2b" />
        <circle cx="68" cy="43" r="3" fill="#3fb52a" />
      </>
    ),
  },
  "Demo day": {
    bg: "#ffb38a",
    body: (
      <>
        {/* spotlight */}
        <path d="M50 0h20l26 90H24z" fill="#ffd6bd" />
        <rect x="0" y="74" width="120" height="16" fill="#e8895a" />
        {/* mic + stand */}
        <rect x="52" y="22" width="16" height="24" rx="8" fill={INK} />
        <path d="M55 29h10M55 34h10M55 39h10" stroke="#6b6660" strokeWidth="1.5" />
        <path d="M46 38c0 9 6 14 14 14s14-5 14-14" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60 52v20M50 74h20" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  "Class projects": {
    bg: "#a8e28f",
    body: (
      <>
        {/* chalkboard */}
        <rect x="16" y="14" width="88" height="54" rx="4" fill="#2f5a34" stroke="#8a6436" strokeWidth="4" />
        <path d="M26 28c6-4 10 4 16 0s10 4 16 0" fill="none" stroke={W} strokeWidth="2" strokeLinecap="round" />
        <path d="M26 40h28M26 50h20" stroke={W} strokeWidth="2" strokeLinecap="round" opacity=".75" />
        <text x="66" y="54" fill="#ffd166" fontFamily="Georgia,serif" fontStyle="italic" fontSize="20" fontWeight="700">A+</text>
        {/* cap */}
        <path d="M60 62l22 8-22 8-22-8z" fill={INK} />
        <path d="M82 70v9" stroke="#ffd166" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  Workshop: {
    bg: "#fff27a",
    body: (
      <>
        {/* rays */}
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => (
          <path key={a} d="M60 8v8" stroke={INK} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 60 38)`} />
        ))}
        {/* bulb */}
        <path d="M60 20c-10 0-17 7-17 17 0 7 4 11 8 15 2 2 2 4 2 6h14c0-2 0-4 2-6 4-4 8-8 8-15 0-10-7-17-17-17z" fill={W} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M54 44l6-6 6 6" fill="none" stroke="#e0b800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="53" y="60" width="14" height="5" rx="1.5" fill={INK} />
        <rect x="55" y="67" width="10" height="4" rx="1.5" fill={INK} />
      </>
    ),
  },
  "Hack week": {
    bg: "#8fe3d2",
    body: (
      <>
        {/* calendar */}
        <rect x="20" y="14" width="80" height="62" rx="6" fill={W} stroke={INK} strokeWidth="2.5" />
        <path d="M20 30h80" stroke={INK} strokeWidth="2.5" />
        <rect x="21.2" y="15.2" width="77.6" height="13.6" rx="5" fill="#12b39a" />
        <path d="M36 10v10M84 10v10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        {Array.from({ length: 10 }, (_, i) => {
          const x = 28 + (i % 5) * 14;
          const y = 38 + Math.floor(i / 5) * 18;
          const done = i < 7;
          return (
            <g key={i}>
              <rect x={x} y={y} width="10" height="10" rx="2.5" fill={done ? "#12b39a" : "#e7f7f3"} />
              {done && <path d={`M${x + 2.5} ${y + 5}l2 2 3.5-4`} fill="none" stroke={W} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
      </>
    ),
  },
  "Prompt-a-thon": {
    bg: "#ff9966",
    body: (
      <>
        {/* chat */}
        <path d="M14 18h56a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H32l-10 8v-8h-8a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" fill={W} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M20 29h40M20 37h26" stroke="#c9c3b8" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 50h52a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6h-4v8l-10-8H52a6 6 0 0 1-6-6V56a6 6 0 0 1 6-6z" fill={INK} />
        <path d="M58 62h30" stroke="#ff9966" strokeWidth="3" strokeLinecap="round" />
        {/* sparkle */}
        <path d="M96 14l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={W} />
        <path d="M86 36l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill={W} />
      </>
    ),
  },
  "Tech fair": {
    bg: "#6fcfd9",
    body: (
      <>
        {/* bunting */}
        <path d="M0 10q60 14 120 0" fill="none" stroke={INK} strokeWidth="1.5" />
        {[8, 24, 40, 56, 72, 88, 104].map((x, i) => (
          <path key={x} d={`M${x} ${11 + Math.sin(((x + 4) / 120) * Math.PI) * 7}l8 0-4 9z`} fill={["#ffd166", "#ff6a2b", W, "#3fb52a", "#ff3d5a", W, "#4f6bff"][i]} />
        ))}
        {/* flask */}
        <path d="M52 26h16M55 26v14l-15 26c-2 4 1 8 5 8h30c4 0 7-4 5-8L65 40V26" fill={W} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M45 58h30l5 8c1 3-1 5-4 5H44c-3 0-5-2-4-5z" fill="#00a6c7" />
        <circle cx="56" cy="50" r="3" fill="none" stroke={INK} strokeWidth="1.5" />
        <circle cx="63" cy="44" r="2" fill="none" stroke={INK} strokeWidth="1.5" />
      </>
    ),
  },
  "Startup weekend": {
    bg: "#d4ec6a",
    body: (
      <>
        {/* stars */}
        <path d="M18 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={W} />
        <path d="M100 62l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill={W} />
        <circle cx="96" cy="20" r="2" fill={INK} />
        {/* trail */}
        <path d="M34 72c6-6 10-10 16-16" stroke="#ff6a2b" strokeWidth="7" strokeLinecap="round" />
        <path d="M28 76c5-5 8-8 12-12" stroke="#ffd166" strokeWidth="5" strokeLinecap="round" />
        {/* rocket, pointing up-right */}
        <g transform="rotate(45 64 44)">
          <path d="M64 12c9 8 12 20 10 34H54c-2-14 1-26 10-34z" fill={W} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="64" cy="30" r="5" fill="#1f8ef1" stroke={INK} strokeWidth="2" />
          <path d="M54 40l-8 10h9M74 40l8 10h-9" fill="#ff3d5a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      </>
    ),
  },
  "Build night": {
    bg: "#9fb4ff",
    body: (
      <>
        {/* moon + stars */}
        <circle cx="94" cy="20" r="10" fill="#fff6c9" />
        <circle cx="99" cy="16" r="9" fill="#9fb4ff" />
        <circle cx="20" cy="16" r="1.8" fill={W} />
        <circle cx="38" cy="26" r="1.3" fill={W} />
        <circle cx="72" cy="12" r="1.5" fill={W} />
        {/* laptop */}
        <rect x="32" y="34" width="56" height="34" rx="4" fill={INK} />
        <rect x="36" y="38" width="48" height="26" rx="2" fill="#2c3e8f" />
        <path d="M41 45h14M41 51h24M41 57h10" stroke="#8ecbff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 70h72l-4 6H28z" fill={INK} />
        {/* glow */}
        <path d="M36 64l-10 10h68l-10-10z" fill="#c9d6ff" opacity=".35" />
      </>
    ),
  },
  "Bootcamp finals": {
    bg: "#ff8f80",
    body: (
      <>
        {/* code window */}
        <rect x="16" y="14" width="88" height="60" rx="6" fill={INK} />
        <circle cx="26" cy="23" r="2.5" fill="#ff6b5c" />
        <circle cx="34" cy="23" r="2.5" fill="#ffd166" />
        <circle cx="42" cy="23" r="2.5" fill="#6cc24f" />
        <path d="M24 38h22M30 46h30M30 54h18M24 62h14" stroke="#6b6660" strokeWidth="3" strokeLinecap="round" />
        <path d="M24 38h10" stroke="#ff8f80" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 46h12" stroke="#8ecbff" strokeWidth="3" strokeLinecap="round" />
        {/* medal */}
        <path d="M80 44l-6 14M92 44l6 14" stroke="#1f8ef1" strokeWidth="5" />
        <circle cx="86" cy="66" r="11" fill="#ffd166" stroke={W} strokeWidth="2.5" />
        <text x="86" y="71" textAnchor="middle" fill={INK} fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="800">1</text>
      </>
    ),
  },
  "Social good": {
    bg: "#e8c79a",
    body: (
      <>
        {/* sun */}
        <circle cx="96" cy="20" r="9" fill="#ffd166" />
        {/* ground + sprout */}
        <path d="M0 74q60-12 120 0v16H0z" fill="#a8e28f" />
        <path d="M30 72v-10" stroke="#3fb52a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 64c-6 0-8-4-8-8 6 0 8 4 8 8zM30 62c6 0 8-4 8-8-6 0-8 4-8 8z" fill="#3fb52a" />
        {/* heart */}
        <path d="M60 70c-15-10-24-18-24-28 0-7 5-12 12-12 5 0 9 3 12 7 3-4 7-7 12-7 7 0 12 5 12 12 0 10-9 18-24 28z" fill="#ff6b5c" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M46 40c1-3 3-4 6-4" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
};

export function PosterArt({ kind }: { kind: string }) {
  const art = ART[kind];
  if (!art) return null;
  return (
    <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="120" height="90" fill={art.bg} />
      {art.body}
    </svg>
  );
}
