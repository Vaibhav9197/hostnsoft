import Link from "next/link";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Shared shell and prose primitives for the site's long-form text pages
 * (terms, privacy, DPA, security, abuse, status).
 *
 * These pages are static server components, so the typography lives in small
 * local primitives rather than a plugin: one narrow measure, one heading
 * rhythm, and the same tokens the marketing pages use.
 */

const MEASURE = "mx-auto w-full max-w-[760px] px-6";

export function DocumentPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** e.g. "March 2026". Omitted on pages that aren't policy documents. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    /* pt-16 clears SiteHeader, which is fixed rather than sticky. */
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <div className={`${MEASURE} pb-20 pt-16`}>
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-[640px]:text-[32px]">
          {title}
        </h1>
        {updated && (
          <p className="mt-4 font-mono text-[13px] text-muted-foreground">Last updated: {updated}</p>
        )}
        <div className="mt-12 space-y-12">{children}</div>
      </div>

      <SiteFooter />
    </main>
  );
}

export function Section({
  title,
  id,
  children,
}: {
  title?: string;
  /** Anchor target, for pages that cross-reference their own sections. */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      {title && <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h2>}
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15.5px] leading-[1.65] text-muted-foreground">{children}</p>;
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2.5 pl-1">{children}</ul>;
}

export function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-5 text-[15.5px] leading-[1.6] text-muted-foreground">
      <span className="absolute left-0 top-[0.7em] h-1 w-1 rounded-full bg-[var(--line-strong)]" />
      {children}
    </li>
  );
}

/** Emphasised lead-in for a list item, e.g. "Deploy tokens — …". */
export function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[4px] bg-elevated px-1.5 py-0.5 font-mono text-[0.86em] text-foreground">
      {children}
    </code>
  );
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  const className = "text-foreground underline decoration-[var(--line-strong)] underline-offset-2 hover:decoration-foreground";
  return external ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * A fact only Embarko's operators can supply — the legal entity, the
 * jurisdiction, a hosting region. Rendered visibly (dashed underline, mono)
 * so an unfilled placeholder can't quietly ship inside a policy page.
 */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span
      title="Placeholder — confirm and replace before publishing"
      className="whitespace-nowrap border-b border-dashed border-[var(--line-strong)] font-mono text-[0.88em] text-faint"
    >
      [{children}]
    </span>
  );
}
