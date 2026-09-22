"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "../components/Header";
import { SiteFooter } from "../components/SiteFooter";
import { LoginModal } from "../components/LoginModal";
import { DOCS, localizeDocHref, slugify, type TocEntry } from "../lib/docs";

/* Turn a heading's rendered children back into plain text, so an id can be
   derived from it. The source writes headings as self-links —
   `## [Overview](#overview)` — so children is usually a single anchor node. */
/* The sidebar, grouped. Order comes from DOCS, so the reading order is set
   in one place; a doc with no `group` is published and routed but kept out
   of the nav (hackathons reads as a landing page, not reference). */
const NAV_GROUPS: { title: string; docs: typeof DOCS }[] = DOCS.reduce(
  (groups, doc) => {
    if (!doc.group) return groups;
    const existing = groups.find((g) => g.title === doc.group);
    if (existing) existing.docs.push(doc);
    else groups.push({ title: doc.group, docs: [doc] });
    return groups;
  },
  [] as { title: string; docs: typeof DOCS }[],
);

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/* A heading written as `## [Text](#slug)` names its own anchor. Pull it back out
   of the rendered link so the id matches what the other docs link to, rather
   than a slug re-derived from the visible text — the two differ often enough
   ("Checking deploy status & logs" is `#status-and-logs`) that deriving one
   breaks the cross-references. */
function explicitId(node: ReactNode): string | null {
  if (Array.isArray(node)) {
    return node.length === 1 ? explicitId(node[0]) : null;
  }
  if (node && typeof node === "object" && "props" in node) {
    const href = (node as { props: { href?: string } }).props.href;
    if (typeof href === "string" && href.startsWith("#")) return href.slice(1);
  }
  return null;
}

/* Each element gets the same styling the hand-written page used, so swapping to
   a remote source didn't change how the docs look. */
const components = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-3xl font-bold text-neutral-950 sm:text-4xl">{children}</h1>
  ),
  /* Headings render as their text, not their children: the source writes each
     one as a self-link (`## [Overview](#overview)`), which would otherwise come
     through underlined and clickable. The id it points at is set here instead. */
  h2: ({ children }: { children?: ReactNode }) => {
    const text = textOf(children);
    return (
      <h2 id={explicitId(children) ?? slugify(text)} className="mt-16 scroll-mt-24 text-2xl font-bold text-neutral-950">
        {text}
      </h2>
    );
  },
  h3: ({ children }: { children?: ReactNode }) => {
    const text = textOf(children);
    return (
      <h3 id={explicitId(children) ?? slugify(text)} className="mt-10 scroll-mt-24 text-lg font-semibold text-neutral-950">
        {text}
      </h3>
    );
  },
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mt-4 text-sm leading-relaxed text-neutral-600">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">{children}</ol>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-neutral-950">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => {
    /* A link to a sibling doc points at its raw .md file; send it to that
       doc's page here instead of handing the reader a file download. */
    const to = localizeDocHref(href);
    return (
      <a
        href={to}
        className="font-medium text-neutral-950 underline underline-offset-2 hover:text-neutral-600"
        /* Anything still off-site opens in a new tab; in-page anchors and the
           rewritten links above must not. */
        {...(to?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mt-4 border-l-2 border-neutral-300 pl-4 text-sm italic text-neutral-500">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="mt-12 border-neutral-200" />,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold text-neutral-950">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border-b border-neutral-100 px-4 py-3 align-top text-neutral-600">{children}</td>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-900 p-4 font-mono text-xs leading-relaxed text-neutral-200">
      {children}
    </pre>
  ),
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    /* react-markdown gives fenced blocks a `language-*` class and inline code
       none — that's how the two cases are told apart. A fenced block is already
       inside the <pre> above, so it only carries the reset. */
    const fenced = Boolean(className);
    if (fenced) return <code className="bg-transparent p-0 text-inherit">{children}</code>;
    return (
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-800">
        {children}
      </code>
    );
  },
};

/* Which section the reader is actually in. A 21-item contents list with no
   current position is a wall of links — this is what makes the nav show where
   you are rather than just what exists. */
function useActiveHeading(toc: TocEntry[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (toc.length === 0) return;

    let frame = 0;

    const pick = () => {
      frame = 0;
      /* The last heading to have passed under the sticky header. Reading
         happens below that line, so that heading is the one you're inside. */
      let current = toc[0].id;
      for (const { id } of toc) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      /* The page can't scroll far enough to push the last heading past the
         line, so without this the final entry would never light up. */
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        current = toc[toc.length - 1].id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [toc]);

  return active;
}

/** An h2 and the h3s that belong under it, so each level can own a rail. */
interface TocSection {
  /** Null only if the doc opens on an h3 before any h2 — then its children
   *  hang off the outer rail with no parent to indent under. */
  heading: TocEntry | null;
  children: TocEntry[];
}

function groupToc(toc: TocEntry[]): TocSection[] {
  const out: TocSection[] = [];
  for (const item of toc) {
    if (item.level === 2 || out.length === 0) {
      const isParent = item.level === 2;
      out.push({ heading: isParent ? item : null, children: isParent ? [] : [item] });
    } else {
      out[out.length - 1].children.push(item);
    }
  }
  return out;
}

/* One entry, on whichever rail its parent put it. The level drives type and
   colour; the rail it sits on is decided by where it's rendered. */
function TocLink({ item, current }: { item: TocEntry; current: boolean }) {
  const nested = item.level === 3;
  return (
    <a
      href={`#${item.id}`}
      aria-current={current ? "location" : undefined}
      /* -ml-px sits the marker on top of the rail rather than beside it, so
         the line thickens in place. */
      className={`-ml-px block border-l-2 leading-snug transition-colors ${
        nested ? "py-1 pl-4 pr-3 text-[13px]" : "py-1.5 pl-4 pr-3 text-sm font-medium"
      } ${
        current
          ? "border-neutral-900 font-semibold text-neutral-950"
          : `border-transparent hover:border-neutral-300 hover:text-neutral-950 ${
              nested ? "text-neutral-500" : "text-neutral-700"
            }`
      }`}
    >
      {item.label}
    </a>
  );
}

/* The contents list itself. Lifted out of the layout because it renders in
   two places: its own right rail on a wide screen, and back under Guides on a
   narrower one where there is no room for a third column. */
function TocBlock({
  sections,
  active,
  className,
}: {
  sections: TocSection[];
  active: string | null;
  className?: string;
}) {
  if (sections.length === 0) return null;
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
        On this page
      </p>
      {/* Two rails, one per level. The outer one is the document's spine and
          every h2 sits on it; the inner one starts exactly at the h2 text edge
          (ml-4 against the parent's pl-4), so a child's line begins where its
          parent's label begins and the nesting is readable without counting
          pixels of indent. The marker for the section you're in rides
          whichever rail it belongs to. */}
      <div className="border-l border-neutral-200">
        {sections.map((section, i) => (
          <div key={section.heading?.id ?? `group-${i}`}>
            {section.heading && (
              <TocLink item={section.heading} current={section.heading.id === active} />
            )}
            {section.children.length > 0 && (
              /* 1rem-1px, not 1rem: the h2 above pulls itself back onto the
                 outer rail with -ml-px, so matching its text edge means
                 starting from the rail, not from the container's content box
                 one pixel to its right. */
              <div className="ml-[calc(1rem-1px)] border-l border-neutral-200">
                {section.children.map((child) => (
                  <TocLink key={child.id} item={child} current={child.id === active} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DocViewProps {
  markdown: string;
  toc: TocEntry[];
  /** Which of DOCS is being shown, so the switcher can mark it. */
  activeSlug: string;
}

export function DocView({ markdown, toc, activeSlug }: DocViewProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const active = useActiveHeading(toc);
  const sections = useMemo(() => groupToc(toc), [toc]);

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <Header onAuthClick={() => setLoginOpen(true)} />

      {/* max-w-7xl, not 6xl: the contents list moved out to its own rail, and
          at 6xl the three columns left the prose at roughly 550px. The header
          and footer set their own widths, so widening here misaligns nothing. */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* The right rail only appears at xl. Between lg and xl a third column
            would take its width out of the prose, so below xl the contents
            list stays under Guides where it used to live. */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_240px]">
          <nav className="hidden lg:block" aria-label="Documentation">
            {/* Scrolls on its own: the guides plus a long contents list runs
                past a short viewport, and a sticky block that overflows just
                hides its own tail. */}
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-10">
              {/* The docs cross-reference each other constantly, so they need
                  to be reachable from one another, not just by URL.
                  Deliberately styled as filled rows, not rail entries: moving
                  between documents is a different act from moving within one,
                  and the two lists shouldn't read as one long menu. */}
              {NAV_GROUPS.map((group, i) => (
                <div key={group.title} className={i === 0 ? undefined : "mt-6"}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.docs.map((d) => (
                      <a
                        key={d.slug}
                        href={d.path}
                        aria-current={d.slug === activeSlug ? "page" : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm leading-snug ${
                          d.slug === activeSlug
                            ? "bg-neutral-100 font-semibold text-neutral-950"
                            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
                        }`}
                      >
                        {d.title}
                      </a>
                    ))}
                  </div>
                </div>
              ))}

              <TocBlock sections={sections} active={active} className="mt-8 xl:hidden" />
            </div>
          </nav>

          <div className="min-w-0 max-w-2xl">
            {/* No "unavailable" fallback: the markdown is bundled from
                content/docs/, so there is no fetch left to fail. */}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {markdown}
            </ReactMarkdown>
          </div>

          <nav className="hidden xl:block" aria-label="On this page">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-10">
              <TocBlock sections={sections} active={active} />
            </div>
          </nav>
        </div>
      </div>

      <SiteFooter />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
