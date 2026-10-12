"use client";

/* The guides' own copy of the docs' prose styling and section tracker
   (app/docs/DocView.tsx), so guides never depend on, or change, the docs. */

import { useEffect, useState, type ReactNode } from "react";
import { localizeDocHref, slugify, type TocEntry } from "../lib/docs";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

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

export const components = {
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
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-800 [overflow-wrap:anywhere]">
        {children}
      </code>
    );
  },
};

/* Where a heading counts as "the one you're reading". It must sit below the
   point a jump-link lands a heading (scroll-mt-24 under the beta bar puts it
   at ~130px); at 120 a clicked section stayed unlit and the rail marked the
   one before it. */
const ACTIVE_LINE = 160;

export function useActiveHeading(toc: TocEntry[]): string | null {
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
        if (el && el.getBoundingClientRect().top <= ACTIVE_LINE) current = id;
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
