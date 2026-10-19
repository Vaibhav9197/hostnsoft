import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";

import "@/app/showcase/showcase.css";
import { HealthPill } from "./HealthPill";
import { formatDateTime, relativeTime } from "../../lib/format";
import { appHost } from "../../lib/site";
import type { Project } from "../../lib/types";

/**
 * An app on "Your apps", in the Showcase tile's shape: preview (which carries
 * the name), address, state. Render inside `.sc > .sc-gal` so the Showcase
 * styles apply.
 *
 * Clicking the tile opens the live app in a new tab. "Manage" opens the app's
 * page in the panel.
 */
export function AppTile({ project: p }: { project: Project }) {
  const host = appHost(p.slug);
  const deploying = p.status === "in_progress";

  return (
    // Borderless, so the shadow alone lifts it off the sky. A shadow can't
    // show on the night ground, so dark mode gets a faint light hairline
    // instead — an outline, which takes no space and leaves the hover
    // shadow alone.
    <article className="sc-tile group !border-0 [[data-theme=dark]_&]:outline [[data-theme=dark]_&]:outline-1 [[data-theme=dark]_&]:-outline-offset-1 [[data-theme=dark]_&]:outline-[rgba(242,240,234,0.12)]">
      <a href={`https://${host}`} target="_blank" rel="noreferrer" className="sc-cover" aria-label={`Open ${p.name}`} />
      <div className="th">
        <NamePlaceholder name={p.name} />
        {/* Above the tile's cover link, so it goes to the panel, not the app.
            Shown on hover (or keyboard focus), so the grid at rest is just the
            apps; on touch screens, which have no hover, it stays visible. */}
        <Link
          href={`/app/projects/${p.id}`}
          className="absolute right-2.5 top-2.5 z-[2] inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--sc-line)] bg-[var(--sc-card)] px-3 text-xs font-medium text-[var(--sc-ink)] shadow-sm transition-[opacity,background-color,color,border-color] hover:border-[var(--sc-ink)] hover:bg-[var(--sc-ink)] hover:text-[var(--sc-card)] focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0"
        >
          <Settings2 className="size-3.5" aria-hidden="true" />
          Manage
        </Link>
        {/* A bar sweeping across the preview while a build runs: the one
            signal somebody notices from across the grid. */}
        {deploying && (
          <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted" aria-hidden="true">
            <span className="block h-full w-1/4 animate-sweep bg-primary" />
          </span>
        )}
      </div>
      <div className="bd">
        <p className="truncate !text-[var(--sc-ink)]">{host}</p>
        {/* `updatedAt` is when the project record last changed, not when the
            app last deployed (a rollback doesn't touch it), hence "updated". */}
        <div className="ft">
          <span title={formatDateTime(p.updatedAt)}>Updated {relativeTime(p.updatedAt)}</span>
          <HealthPill health={p.health} deploying={deploying} failingJobs={p.schedules?.failing} labelOnHover className="ml-auto flex-none" />
        </div>
      </div>
    </article>
  );
}

/** The last tile on "Your apps": an empty slot to host a new app. */
export function CreateAppTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[var(--sc-r)] border-2 border-dashed border-[var(--sc-ink)] bg-[var(--sc-card)]/50 p-6 text-[var(--sc-ink)] transition-[transform,background-color] duration-300 hover:-translate-y-1 hover:bg-[var(--sc-card)]"
    >
      <span className="grid size-12 place-items-center rounded-full bg-[var(--sc-ink)] text-[var(--sc-card)]">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold">Host new app</span>
    </button>
  );
}

/**
 * The preview for an app with no image: its name, big, on a calm ground.
 * One type size for every tile (scaled to the tile's width), so a grid reads
 * evenly; a long name wraps instead of shrinking. Decoration only: the name
 * is already the tile's heading.
 */
function NamePlaceholder({ name }: { name: string }) {
  return (
    <div aria-hidden="true" className="grid h-full w-full place-items-center bg-[var(--sc-soft)] p-[8%] [container-type:inline-size]">
      <span className="line-clamp-3 text-center text-[14cqw] font-extrabold leading-[1.05] tracking-[-0.04em] text-[var(--sc-ink)] [overflow-wrap:anywhere]">
        {name}
      </span>
    </div>
  );
}
