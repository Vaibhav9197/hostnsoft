"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, ChevronDown, List } from "lucide-react";
import { components, useActiveHeading } from "../docs/DocView";
import { formatDate, type PostParts } from "../lib/blog";
import type { TocEntry } from "../lib/docs";
import { BlogShare } from "./BlogShare";

interface BlogArticleProps {
  parts: PostParts;
  /** The post's h2s only: a jump list of every h3 is longer than the post needs. */
  toc: TocEntry[];
  /** What the share buttons send. */
  title: string;
  author: string;
  datePublished: string;
  dateModified: string;
  readMinutes: number;
}

/* Wrapped so the article can size its prose (16px) without touching the
   small labels around it. */
function Markdown({ children }: { children: string }) {
  return (
    <div className="guide-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/* The jump links shown under the intro, on screens without room for the rail.
   One tap from the top of the post to any section. */
function JumpLinks({ toc }: { toc: TocEntry[] }) {
  if (toc.length === 0) return null;
  return (
    <nav aria-label="Jump to a section" className="rounded-xl border border-neutral-200 bg-white/60 p-5 lg:hidden">
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


/* How far down the article the reader is, 0 to 1, for the bar above the
   contents list. Measured on the article itself, so the header image and the
   Continue reading block below don't count. */
function useReadProgress(): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = document.getElementById("guide-body");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setP(total <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / total)));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return p;
}

/**
 * The sidebar contents list. One rail with the marker drawn on it (the
 * marker is the rail, thickened, so the two can never sit apart); sections
 * already read are darker than the ones still ahead, and the current one is
 * ink and bold.
 */
function GuideToc({ toc, active }: { toc: TocEntry[]; active: string | null }) {
  const progress = useReadProgress();
  const at = Math.max(0, toc.findIndex((t) => t.id === active));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.06em] text-neutral-500">On this page</p>
        <p className="font-mono text-xs tabular-nums text-neutral-500" aria-hidden="true">
          {Math.round(progress * 100)}%
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true">
        <div className="h-full rounded-full bg-neutral-950 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="mt-5">
        {toc.map((item, i) => {
          const current = item.id === active;
          const read = i < at;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={`grid grid-cols-[auto_1fr] gap-3 border-l-2 py-2 pl-4 pr-2 text-[13.5px] leading-snug transition-colors ${
                  current
                    ? "border-neutral-950 font-semibold text-neutral-950"
                    : `border-neutral-200 hover:border-neutral-400 hover:text-neutral-950 ${read ? "text-neutral-700" : "text-neutral-500"}`
                }`}
              >
                <span className="w-5 font-mono text-[11px] leading-[1.6] tabular-nums opacity-70">{String(i + 1).padStart(2, "0")}</span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>

      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0 });
        }}
        className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-950"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
        Back to top
      </a>
    </div>
  );
}

/**
 * One post below its header: the article column (intro, jump links, body,
 * FAQ accordions) and, from lg up, a sticky sidebar laid out like the
 * Showcase app page's, holding "On this page".
 * Client-side only because the markdown renderer and the scroll-spy are; the
 * page around it stays a server component.
 */
export function BlogArticle({ parts, toc, title, author, datePublished, dateModified, readMinutes }: BlogArticleProps) {
  const active = useActiveHeading(toc);
  useOpenTargetedFaq();

  const details: [string, string][] = [
    ["Published", formatDate(datePublished)],
    ...(dateModified !== datePublished ? ([["Updated", formatDate(dateModified)]] as [string, string][]) : []),
    ["Read time", `${readMinutes} min`],
    ...(parts.faq.length ? ([["Questions answered", String(parts.faq.length)]] as [string, string][]) : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
      <article
        id="guide-body"
        className="min-w-0 max-w-2xl [&_.guide-prose_li]:text-base [&_.guide-prose_p]:text-base [&_.guide-prose_p]:leading-[1.75] [&_.guide-prose_td]:text-[15px] [&_.guide-prose_th]:text-[15px]"
      >
        {/* Phones and tablets: the contents box comes first, so a reader can
            jump before scrolling. From lg up the sidebar does this job. */}
        <JumpLinks toc={toc} />
        {parts.takeaways && (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-[var(--surface)] px-6 pb-6 sm:px-8 lg:mt-0 [&>h2:first-child]:mt-6">
            <Markdown>{parts.takeaways}</Markdown>
          </div>
        )}
        <div className={parts.takeaways ? "mt-8" : undefined}>
          <Markdown>{parts.intro}</Markdown>
        </div>
        {parts.main && <Markdown>{parts.main}</Markdown>}
        {/* Who wrote it and the facts about it, just above the FAQ. No "Last
            verified" or AI-disclosure line on any post (owner decision,
            2026-10-08). */}
        <footer className="mt-14 border-y border-neutral-200 py-8">
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-neutral-500">Written by</p>
          <p className="mt-1 text-lg font-semibold text-neutral-950">{author}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            {details.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="mt-0.5 font-medium text-neutral-950">{v}</dd>
              </div>
            ))}
          </dl>
        </footer>

        {parts.faqHeading && <Markdown>{parts.faqHeading}</Markdown>}
        {parts.faq.length > 0 && <FaqList items={parts.faq} />}
        {parts.outro && <Markdown>{parts.outro}</Markdown>}

        <section aria-labelledby="share-h" className="mt-10 rounded-2xl border border-neutral-200 bg-[var(--surface)] p-6 sm:p-7">
          <h2 id="share-h" className="text-lg font-semibold text-neutral-950">
            Found this useful? Share it.
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Send it to someone whose AI just built an app.</p>
          <div className="mt-5">
            <BlogShare title={title} />
          </div>
        </section>
      </article>

      <nav className="hidden lg:block" aria-label="On this page">
        <div className="sticky top-[calc(6rem+var(--beta-bar-h))] flex max-h-[calc(100vh-8rem-var(--beta-bar-h))] flex-col gap-10 overflow-y-auto overscroll-contain pb-10 [scrollbar-width:none]">
          <GuideToc toc={toc} active={active} />
        </div>
      </nav>
    </div>
  );
}
