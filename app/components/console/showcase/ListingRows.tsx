"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

import "@/app/showcase/showcase.css";
import { Tile } from "@/app/showcase/kit";

import { LinkButton, Tag } from "@/app/components/console/kit";
import { formatDate } from "@/app/lib/format";
import type { ShowcaseListing } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

/**
 * The apps on one showcase page, as the organiser manages them: each row is
 * the app as the public sees it (screenshot, name, builder, one line), with
 * the one control that matters — is it showing — and a way to take it off.
 *
 * Used by both kinds of page. On an event page, where apps come from anyone,
 * rows say which are yours (only while someone else's are there too — a tag
 * on every row says nothing) and which arrived since your last visit; on
 * Embarko Showcase everything is yours, so neither tag is shown.
 *
 * Search and the filter chips appear only once the list is long enough to
 * need them.
 */

/** On the public page: not switched off by the organiser. */
export function visible(l: ShowcaseListing): boolean {
  return !l.isPrivate;
}

/** "No apps yet" · "3 apps showing" · "2 of 3 apps showing". */
export function showingText(listings: ShowcaseListing[]): string {
  const total = listings.length;
  const shown = listings.filter(visible).length;
  if (total === 0) return "No apps yet";
  if (shown === total) return total === 1 ? "1 app showing" : `${total} apps showing`;
  return `${shown} of ${total} apps showing`;
}

const TOOLBAR_AT = 6;
const PAGE_SIZE = 50;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
/* Text links that sit on their own: a 44px target on phones. */
const TAP = "max-sm:inline-flex max-sm:min-h-11 max-sm:items-center";

type Chip = "all" | "mine" | "others";
const CHIP_LABEL: Record<Chip, string> = { all: "All", mine: "My apps", others: "Submitted by others" };

export function ListingRows({
  variant,
  listings,
  activeCompanyId,
  isNew,
  removing,
  busy,
  onToggle,
  onRemove,
  leading,
}: {
  variant: "event" | "company";
  /** Tiles drawn first in the same grid — an event page's requests. */
  leading?: React.ReactNode;
  /** Everything on screen, including rows that are collapsing out. */
  listings: ShowcaseListing[];
  activeCompanyId: string;
  isNew: (l: ShowcaseListing) => boolean;
  /** Removed rows, still on screen while they collapse. */
  removing: ReadonlySet<string>;
  /** Rows with a removal in flight. */
  busy: ReadonlySet<string>;
  onToggle: (l: ShowcaseListing, on: boolean) => void;
  onRemove: (l: ShowcaseListing) => void;
}) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const mine = (l: ShowcaseListing) => l.companyId === activeCompanyId;
  const live = listings.filter((l) => !removing.has(l.id));
  const mineCount = live.filter(mine).length;
  const othersCount = live.length - mineCount;

  const toolbar = live.length >= TOOLBAR_AT;
  const chipsShown = toolbar && variant === "event" && mineCount > 0 && othersCount > 0;
  /* A filter that is no longer on screen stops applying: removing apps can
     take the list under the toolbar's threshold, or empty one side. */
  const q = toolbar ? query.trim().toLowerCase() : "";
  const activeChip: Chip = chipsShown ? chip : "all";

  const sorted = [...listings].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filtered = sorted.filter((l) => {
    if (activeChip === "mine" && !mine(l)) return false;
    if (activeChip === "others" && mine(l)) return false;
    if (!q) return true;
    return [l.name, l.tagline, l.creatorName].some((s) => s?.toLowerCase().includes(q));
  });
  const rows = filtered.slice(0, limit);
  const left = filtered.length - rows.length;
  const noResults = filtered.every((l) => removing.has(l.id)) && (q !== "" || activeChip !== "all");

  function pick(next: Chip) {
    setChip(next);
    setLimit(PAGE_SIZE);
  }

  function search(next: string) {
    setQuery(next);
    setLimit(PAGE_SIZE);
  }

  function clearAll() {
    search("");
    pick("all");
    searchRef.current?.focus();
  }

  const counts: Record<Chip, number> = { all: live.length, mine: mineCount, others: othersCount };

  return (
    <div className="flex flex-col gap-3">
      {toolbar && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-[280px]">
            <label htmlFor="showcase-search" className="sr-only">
              Search apps or builders
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
            />
            <input
              id="showcase-search"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  search("");
                }
              }}
              placeholder="Search apps or builders"
              autoComplete="off"
              className={cn(
                "h-11 w-full border border-input bg-transparent pl-9 pr-10 text-base text-foreground shadow-sm outline-none placeholder:text-muted-foreground sm:h-9 sm:text-sm",
                "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "[&::-webkit-search-cancel-button]:hidden",
              )}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  search("");
                  searchRef.current?.focus();
                }}
                className={cn(
                  "absolute right-0 top-0 grid h-full w-10 place-items-center text-faint transition-colors hover:text-foreground motion-reduce:transition-none",
                  FOCUS,
                )}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>

          {chipsShown && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter apps">
              {(["all", "mine", "others"] as const).map((c) => {
                const on = activeChip === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(c)}
                    className={cn(
                      "inline-flex h-11 items-center gap-1.5 rounded-full border border-control px-3 text-[0.82rem] transition-colors motion-reduce:transition-none sm:h-8",
                      on ? "border-foreground bg-foreground text-background" : "text-foreground hover:bg-accent",
                      FOCUS,
                    )}
                  >
                    {CHIP_LABEL[c]}
                    <span className={on ? "text-background opacity-70" : "text-muted-foreground"}>{counts[c]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {noResults ? (
        <div className="py-10 text-center text-[0.9rem] text-muted-foreground">
          {activeChip === "all" ? (
            <>
              No apps match “{query.trim()}”.{" "}
              <LinkButton onClick={clearAll} className={cn(TAP, FOCUS)}>
                Clear search
              </LinkButton>
            </>
          ) : (
            <>
              No apps match{q ? ` “${query.trim()}”` : ""} in {CHIP_LABEL[activeChip]}.{" "}
              <LinkButton onClick={clearAll} className={cn(TAP, FOCUS)}>
                Show all
              </LinkButton>
            </>
          )}
        </div>
      ) : (
        /* The same cards the public Showcase shows, so the panel looks like
           the page it manages. */
        <div className="sc">
        <div className="sc-gal !pb-0">
          {leading}
          {rows.map((l) => (
            <Row
              key={l.id}
              l={l}
              own={mine(l)}
              yours={variant === "event" && activeChip === "all" && othersCount > 0 && mine(l)}
              fresh={variant === "event" && isNew(l)}
              removing={removing.has(l.id)}
              busy={busy.has(l.id)}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </div>
        </div>
      )}

      {!noResults && left > 0 && (
        <div className="flex justify-center pt-1">
          <LinkButton onClick={() => setLimit((n) => n + PAGE_SIZE)} className="min-h-11 sm:min-h-0">
            Show more ({left} left)
          </LinkButton>
        </div>
      )}
    </div>
  );
}

function Row({
  l,
  own,
  yours,
  fresh,
  removing,
  busy,
  onToggle,
  onRemove,
}: {
  l: ShowcaseListing;
  own: boolean;
  yours: boolean;
  fresh: boolean;
  removing: boolean;
  busy: boolean;
  onToggle: (l: ShowcaseListing, on: boolean) => void;
  onRemove: (l: ShowcaseListing) => void;
}) {
  return (
    <div
      data-listing={l.id}
      className={cn(
        "flex flex-col gap-2 transition-opacity duration-200 motion-reduce:transition-none",
        removing ? "opacity-0" : l.isPrivate ? "opacity-60" : "opacity-100",
      )}
    >
      <Tile app={l} />
      <div className="flex items-start justify-between gap-3 px-1 text-[0.78rem] text-muted-foreground">
        <div className="min-w-0">
          {(yours || fresh) && (
            <span className="mb-1 flex items-center gap-1.5 [&>span]:ml-0">
              {yours && <Tag>Yours</Tag>}
              {fresh && <Tag tone="ok">New</Tag>}
            </span>
          )}
          <span className="text-faint">Added {formatDate(l.createdAt)}</span>
        </div>
        <LinkButton
          disabled={busy || removing}
          onClick={() => onRemove(l)}
          className={cn("min-h-11 shrink-0 px-1 sm:min-h-0", FOCUS)}
        >
          Remove<span className="sr-only"> {l.name}</span>
        </LinkButton>
      </div>
    </div>
  );
}

