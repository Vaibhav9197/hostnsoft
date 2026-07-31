/**
 * hostnsoft brand logo — "Hosting 'n' Software".
 * The mark pairs code brackets < > (software) around a central
 * link node (hosting), inside a rounded gradient badge. The wordmark
 * highlights the connecting "n".
 */

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="hostnsoft"
    >
      <defs>
        <linearGradient id="hns-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B5BF0" />
          <stop offset="1" stopColor="#4033B8" />
        </linearGradient>
      </defs>

      {/* badge */}
      <rect x="0" y="0" width="40" height="40" rx="11" fill="url(#hns-grad)" />

      {/* soft highlight */}
      <rect x="0" y="0" width="40" height="20" rx="11" fill="#fff" opacity="0.08" />

      {/* left bracket  <  */}
      <path
        d="M16 12 L9 20 L16 28"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* right bracket  >  */}
      <path
        d="M24 12 L31 20 L24 28"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* central link node — the "n" that joins host & soft */}
      <circle cx="20" cy="20" r="2.6" fill="#8BE9C6" />
    </svg>
  );
}

export function Logo({ markSize = 32 }: { markSize?: number }) {
  return (
    <span className="brand">
      <LogoMark size={markSize} />
      <span className="wordmark">
        host<span className="wm-accent">n</span>soft
      </span>
    </span>
  );
}
