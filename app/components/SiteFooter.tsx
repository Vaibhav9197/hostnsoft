import Link from "next/link";
import { SKILL_REPO } from "../lib/site";

/**
 * The site-wide footer for the standalone pages (terms, privacy, DPA,
 * security, abuse, status). Three link columns plus a bottom bar.
 *
 * `llms.txt` is a static file in /public, so it needs a plain anchor rather
 * than next/link — Link would try to route it through the app router.
 *
 * `measure` defaults to the marketing pages' content column so the footer
 * lines up with the sections above it. Pages on a different column — the
 * narrow text pages, say — pass their own.
 */

/* Full-bleed rather than the landing pages' 1120px column: the footer is a
   rule across the bottom of the page, and two short rows of links pinned to
   the far edges read as the page's frame instead of one more section. */
const MARKETING_MEASURE = "w-full px-8 max-[640px]:px-5";

/* One row of links rather than headed columns: four links did not need three
   headings and three columns of chrome to be found. */
const NAV_LINKS = [
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  /* { label: "Status", href: "/status" }, */
  /* A static file in /public, so a plain anchor — Link would route it. */
  { label: "llms.txt", href: "/llms.txt", external: true },
  { label: "Agent skill", href: SKILL_REPO, external: true, newTab: true },
  { label: "Contact", href: "/support" },
] as const;

/* The bottom-bar repeat of the policy pages: regulators and payment providers
   look for these on every page, and a reader scanning the fine print looks at
   the fine print, not back up at a column. */
const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "DPA", href: "/dpa" },
  { label: "Security", href: "/security" },
  { label: "Abuse", href: "/abuse" },
] as const;

export function SiteFooter({ measure = MARKETING_MEASURE }: { measure?: string }) {
  return (
    <footer className="py-8">
      <div className={measure}>
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
          <span className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight text-foreground">
            {/* Same mark as the header; decorative, the wordmark reads it out. */}
            <img src="/assets/embarko-icon.svg" alt="" aria-hidden="true" className="size-5 rounded" />
            Embarko
          </span>

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) =>
              "external" in link && link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target={"newTab" in link ? "_blank" : undefined}
                  rel={"newTab" in link ? "noopener noreferrer" : undefined}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Embarko — hosting for AI-built apps</span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
