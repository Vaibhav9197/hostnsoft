import Link from "next/link";

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
 * The tile opens the app's page in the panel. The address opens the app itself.
 */
export function AppTile({ project: p }: { project: Project }) {
  const host = appHost(p.slug);
  const deploying = p.status === "in_progress";

  return (
    <article className="sc-tile">
      <Link href={`/app/projects/${p.id}`} className="sc-cover" aria-label={`${p.name}, app details`} />
      <div className="th">
        <NamePlaceholder name={p.name} />
        {/* A bar sweeping across the preview while a build runs: the one
            signal somebody notices from across the grid. */}
        {deploying && (
          <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted" aria-hidden="true">
            <span className="block h-full w-1/4 animate-sweep bg-primary" />
          </span>
        )}
      </div>
      <div className="bd">
        <p>
          <a
            href={`https://${host}`}
            target="_blank"
            rel="noreferrer"
            className="relative z-[2] text-[var(--sc-ink)] underline-offset-2 hover:underline"
          >
            {host}
          </a>
        </p>
        {/* `updatedAt` is when the project record last changed, not when the
            app last deployed (a rollback doesn't touch it), hence "updated". */}
        <div className="ft">
          <span title={formatDateTime(p.updatedAt)}>Updated {relativeTime(p.updatedAt)}</span>
          <HealthPill health={p.health} deploying={deploying} className="flex-none" />
        </div>
      </div>
    </article>
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
