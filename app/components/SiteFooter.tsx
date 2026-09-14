'use client';

import { useState } from 'react';
import Link from "next/link";
import { ContactDialog } from './ContactDialog';

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

/** Same column as the landing pages' WRAP (app/v3/page.tsx). */
const MARKETING_MEASURE = "mx-auto w-full max-w-[1120px] px-8 max-[640px]:px-5";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
      /* { label: "Status", href: "/status" }, */
      { label: "llms.txt", href: "/llms.txt", external: true },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "DPA", href: "/dpa" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Security", href: "/security" },
      { label: "Abuse", href: "/abuse" },
    ],
  },
] as const;

export function SiteFooter({ measure = MARKETING_MEASURE }: { measure?: string }) {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <>
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
      <footer className="border-t border-border py-16">
        <div className={measure}>
          <div className="grid gap-10 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-16">
            <div>
              <span className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight text-foreground">
                {/* Same mark as the header; decorative, the wordmark reads it out. */}
                <img src="/assets/embarko-icon.svg" alt="" aria-hidden="true" className="size-5 rounded" />
                Embarko
              </span>
              <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-muted-foreground">
                Hosting for the apps your AI builds.
              </p>
            </div>

            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
                  {column.heading}
                </p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          className="text-sm text-muted-foreground transition hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                  {column.heading === "Company" && (
                    <li>
                      <button
                        onClick={() => setContactOpen(true)}
                        className="text-sm text-muted-foreground transition hover:text-foreground cursor-pointer"
                      >
                        Contact
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Embarko — hosting for AI-built apps
          </div>
        </div>
      </footer>
    </>
  );
}
