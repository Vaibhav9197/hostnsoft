"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";

import type { ShowcaseApp } from "../lib/showcase";
import { Tile } from "./kit";

/** Matches an app against a free-text query across every field a visitor
 *  might search by: name, description, creator, tags, category, the AI it was
 *  built with, and the name of the page it is on. */
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

type Sort = "new" | "az";
const SORTS: Array<[Sort, string]> = [
  ["new", "New"],
  ["az", "A–Z"],
];

/**
 * Search, category chips and sort over the gallery. One piece of state for
 * all three, so they always agree. Chip counts are real: they count the apps
 * this page loaded, and a category with none is not shown.
 */
export function SearchGallery({ apps }: { apps: ShowcaseApp[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const inputRef = useRef<HTMLInputElement>(null);

  /* "/" jumps to search, like the design's kbd hint says — unless the visitor
     is already typing somewhere. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of apps) {
      if (app.category) counts.set(app.category, (counts.get(app.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [apps]);

  const results = useMemo(() => {
    const list = apps.filter((app) => (!category || app.category === category) && matches(app, query));
    return list.sort(
      sort === "az"
        ? (a, b) => a.name.localeCompare(b.name)
        : (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }, [apps, query, category, sort]);

  const filtering = query.trim().length > 0 || category !== null;

  return (
    <section aria-label="Explore apps" id="explore" className="sc-explore">
      <div className="sc-bar">
        <label className="sc-search">
          <Search aria-hidden="true" />
          <span className="sc-sr">Search apps</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps, makers, tags…"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="sc-seg" role="group" aria-label="Sort">
          {SORTS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(value)}>
              {label}
            </button>
          ))}
        </div>
        {categories.length > 1 && (
          <div className="sc-chips" role="group" aria-label="Category">
            <button type="button" className="sc-chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
              All
            </button>
            {categories.map(([name, count]) => (
              <button
                key={name}
                type="button"
                className="sc-chip"
                aria-pressed={category === name}
                onClick={() => setCategory(category === name ? null : name)}
              >
                {name}
                <sup>{count}</sup>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtering && (
        <p className="sc-sr" aria-live="polite">
          {results.length} {results.length === 1 ? "result" : "results"}
        </p>
      )}

      <div className="sc-gal">
        {results.length > 0 ? (
          results.map((app, i) => <Tile key={app.id} app={app} index={i} />)
        ) : (
          <div className="sc-empty">
            <h3>Nothing matches &ldquo;{query.trim() || category}&rdquo; yet</h3>
            <p>That could be your app. Ask your agent to build it and put it online with Embarko.</p>
            <div className="acts">
              <button
                type="button"
                className="sc-btn"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                }}
              >
                Clear filters
              </button>
              <a className="sc-btn pri" href="#deploy">
                Build it <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Company and event pages. Kept as a quiet line of links rather than a
          sidebar: most visitors browse by category, not by page. */}
    </section>
  );
}
