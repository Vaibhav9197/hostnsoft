"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "../components/Header";
import { SiteFooter } from "../components/SiteFooter";
import { LoginModal } from "../components/LoginModal";
import { DOCS, localizeDocHref, slugify, type TocEntry } from "../lib/docs";

/* Turn a heading's rendered children back into plain text, so an id can be
   derived from it. The source writes headings as self-links —
   `## [Overview](#overview)` — so children is usually a single anchor node. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
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
      <h2 id={slugify(text)} className="mt-16 scroll-mt-24 text-2xl font-bold text-neutral-950">
        {text}
      </h2>
    );
  },
  h3: ({ children }: { children?: ReactNode }) => {
    const text = textOf(children);
    return (
      <h3 id={slugify(text)} className="mt-10 scroll-mt-24 text-lg font-semibold text-neutral-950">
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
    /* A link to a sibling doc points at its raw .md upstream; send it to that
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

interface DocViewProps {
  markdown: string | null;
  toc: TocEntry[];
  /** Which of DOCS is being shown, so the switcher can mark it. */
  activeSlug: string;
}

export function DocView({ markdown, toc, activeSlug }: DocViewProps) {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <Header onAuthClick={() => setLoginOpen(true)} />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              {/* The three docs cross-reference each other constantly, so they
                  need to be reachable from one another, not just by URL. */}
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Guides
              </p>
              {DOCS.map((d) => (
                <a
                  key={d.slug}
                  href={d.path}
                  aria-current={d.slug === activeSlug ? "page" : undefined}
                  className={`block rounded-lg px-3 py-1.5 text-sm ${
                    d.slug === activeSlug
                      ? "bg-neutral-100 font-semibold text-neutral-950"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                  }`}
                >
                  {d.title}
                </a>
              ))}

              <p className="mb-3 pt-6 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                On this page
              </p>
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block rounded-lg py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 ${
                    item.level === 3 ? "pl-6 pr-3 text-[13px]" : "px-3"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="min-w-0 max-w-2xl">
            {markdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {markdown}
              </ReactMarkdown>
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
                <h1 className="text-xl font-bold text-neutral-950">Documentation is unavailable</h1>
                <p className="mt-2 text-sm text-neutral-600">
                  We couldn&rsquo;t load the docs just now. Please refresh in a moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
