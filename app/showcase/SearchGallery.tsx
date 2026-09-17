"use client";

import { useMemo, useState } from "react";

import type { Collection, ShowcaseApp } from "../lib/showcase";
import { AppCard, LABEL, WRAP } from "./kit";

/** Matches an app against a free-text query across every field the spec asks
 *  a visitor to be able to search by: name, description, creator, hashtags,
 *  category, the AI it was built with, and its board's name. */
function matches(app: ShowcaseApp, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    app.name,
    app.tagline,
    app.whatItDoes,
    app.creatorName,
    app.category,
    app.builtWith,
    app.collection?.title,
    ...app.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

/**
 * The gallery's search + board directory, together: filtering the flat app
 * list also has to respect whichever board is selected in the sidebar, so
 * the two controls share one piece of state rather than living in separate
 * components that would need to coordinate through the URL or a store.
 */
export function SearchGallery({
  apps,
  collections,
}: {
  apps: ShowcaseApp[];
  collections: Collection[];
}) {
  const [query, setQuery] = useState("");
  const [boardSlug, setBoardSlug] = useState<string | null>(null);

  const results = useMemo(() => {
    return apps
      .filter((app) => {
        if (boardSlug && app.collection?.slug !== boardSlug) return false;
        return matches(app, query);
      })
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [apps, query, boardSlug]);

  const filtering = query.trim().length > 0 || boardSlug !== null;

  return (
    <section className="pb-[88px] max-[720px]:pb-[60px]" id="browse">
      <div className={WRAP}>
        <div className="grid grid-cols-[220px_1fr] gap-8 max-[860px]:grid-cols-1 max-[860px]:gap-6">
          {/* Table-of-contents style directory of public boards. Sits beside
              the results rather than above them, so picking a board doesn't
              cost the visitor their scroll position in the grid. */}
          <aside>
            <p className={`${LABEL} mb-4`}>Boards</p>
            <nav className="flex flex-col max-[860px]:flex-row max-[860px]:flex-wrap max-[860px]:gap-2">
              <button
                type="button"
                onClick={() => setBoardSlug(null)}
                aria-current={boardSlug === null ? "true" : undefined}
                className={`rounded-[8px] px-3 py-2 text-left text-[14px] transition max-[860px]:border max-[860px]:border-border ${
                  boardSlug === null
                    ? "bg-[var(--accent-2)]/10 font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All apps
              </button>
              {collections.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setBoardSlug(c.slug === boardSlug ? null : c.slug)}
                  aria-current={boardSlug === c.slug ? "true" : undefined}
                  className={`rounded-[8px] px-3 py-2 text-left text-[14px] transition max-[860px]:border max-[860px]:border-border ${
                    boardSlug === c.slug
                      ? "bg-[var(--accent-2)]/10 font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <label className="block">
              <span className="sr-only">Search apps</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, creator, category, AI used, or board…"
                className="w-full rounded-[10px] border border-border bg-elevated px-4 py-3 text-[15px] outline-none transition placeholder:text-muted-foreground focus:border-[var(--line-strong)]"
              />
            </label>

            {filtering && (
              <p className={`${LABEL} mt-6`}>
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
            )}

            {results.length > 0 ? (
              <div className="mt-6 grid grid-cols-3 gap-6 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
                {results.map((app) => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[14px] border border-dashed border-border px-8 py-16 text-center">
                <p className="text-[17px] font-medium">Nothing matches yet.</p>
                <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
                  Try a different name, creator, category, or board.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
