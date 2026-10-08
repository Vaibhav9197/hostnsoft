"use client";

import { useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, List } from "lucide-react";
import { components, groupToc, TocBlock, useActiveHeading } from "../docs/DocView";
import { formatDate, type PostParts } from "../lib/blog";
import type { TocEntry } from "../lib/docs";

interface BlogArticleProps {
  parts: PostParts;
  /** The post's h2s only: a jump list of every h3 is longer than the post needs. */
  toc: TocEntry[];
  category: string;
  readMinutes: number;
  dateModified: string;
  author: string;
}

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}

/* The jump links shown under the intro, on screens without room for the rail.
   One tap from the top of the post to any section. */
function JumpLinks({ toc }: { toc: TocEntry[] }) {
  if (toc.length === 0) return null;
  return (
    <nav aria-label="Jump to a section" className="mt-8 rounded-xl border border-neutral-200 bg-white/60 p-5 lg:hidden">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
        <List className="size-4" aria-hidden="true" />
        On this page
      </p>
      <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {toc.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex gap-2 rounded-md py-1.5 text-sm leading-snug text-neutral-700 hover:text-neutral-950 hover:underline hover:underline-offset-2"
            >
              <span className="w-5 shrink-0 tabular-nums text-neutral-400">{i + 1}.</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* One question per row, closed until clicked. Native <details>, so it works
   without JavaScript, the answers stay in the HTML for search engines, and
   the keyboard and screen readers already know what to do with it. */
function FaqList({ items }: { items: PostParts["faq"] }) {
  return (
    <div className="mt-6 border-t border-neutral-200">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group scroll-mt-24 border-b border-neutral-200">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-neutral-950 hover:text-neutral-700 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              className="size-5 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="pb-5 [&>*:first-child]:mt-0">
            <Markdown>{item.answer}</Markdown>
          </div>
        </details>
      ))}
    </div>
  );
}

/* A link straight to one question (#faq-env) should land on it open, not on
   a closed row the reader then has to find and click. */
function useOpenTargetedFaq() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
        el.scrollIntoView();
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
}

/**
 * One post: intro, jump links, body, FAQ accordions, with the docs' prose
 * styling and a sticky "On this page" rail from lg up. Client-side only
 * because the markdown renderer and the scroll-spy are; the page around it
 * stays a server component.
 */
export function BlogArticle({
  parts,
  toc,
  category,
  readMinutes,
  dateModified,
  author,
}: BlogArticleProps) {
  const active = useActiveHeading(toc);
  const sections = useMemo(() => groupToc(toc), [toc]);
  useOpenTargetedFaq();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
      <article className="min-w-0 max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          {category} · {readMinutes} min read · Updated {formatDate(dateModified)}
        </p>

        <Markdown>{parts.intro}</Markdown>
        <JumpLinks toc={toc} />
        {parts.main && <Markdown>{parts.main}</Markdown>}
        {parts.faqHeading && <Markdown>{parts.faqHeading}</Markdown>}
        {parts.faq.length > 0 && <FaqList items={parts.faq} />}
        {parts.outro && <Markdown>{parts.outro}</Markdown>}

        {/* Byline only. No "Last verified ..." or "Drafted with AI assistance ..."
            line on any post: the owner decided readers should not see them
            (2026-10-08). The update date already sits at the top of the post. */}
        <footer className="mt-14 border-t border-neutral-200 pt-6 text-sm leading-relaxed text-neutral-600">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Written by</p>
          <p className="mt-1 font-semibold text-neutral-950">{author}</p>
        </footer>
      </article>

      <nav className="hidden lg:block" aria-label="On this page">
        <div className="sticky top-[calc(6rem+var(--beta-bar-h))] max-h-[calc(100vh-8rem-var(--beta-bar-h))] overflow-y-auto pb-10">
          <TocBlock sections={sections} active={active} />
        </div>
      </nav>
    </div>
  );
}
