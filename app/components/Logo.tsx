/**
 * hostnsoft brand logo — "Hosting 'n' Software".
 * The mark pairs code brackets < > (software) around a central
 * link node (hosting), inside a sharp green badge. The wordmark
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
      {/* badge — bright green, sharp corners */}
      <rect x="0" y="0" width="40" height="40" rx="0" fill="#86F09B" />

      {/* left bracket  <  */}
      <path
        d="M16 12 L9 20 L16 28"
        stroke="#07130B"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* right bracket  >  */}
      <path
        d="M24 12 L31 20 L24 28"
        stroke="#07130B"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* central link node — the "n" that joins host & soft */}
      <circle cx="20" cy="20" r="2.6" fill="#07130B" />
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
