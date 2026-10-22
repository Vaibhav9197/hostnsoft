"use client";

import "@/app/showcase/showcase.css";
import { Tile } from "@/app/showcase/kit";

import { LinkButton } from "@/app/components/console/kit";
import { Button } from "@/app/components/ui/button";
import type { ShowcaseListing } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

/**
 * Apps submitted to an event page that aren't on it yet: pending ones wait
 * for Approve / Reject, rejected ones stay here (dimmed, with the reason)
 * until removed or resubmitted. Same tiles as ListingRows, so a request
 * looks like what it will become; its state floats on the screenshot.
 *
 * `bare` renders just the tiles, for a grid that ListingRows already draws —
 * requests and live apps share one "Apps on this page" grid.
 */
export function RequestRows({
  listings,
  busy,
  onApprove,
  onReject,
  onRemove,
  bare,
  readOnly,
}: {
  listings: ShowcaseListing[];
  bare?: boolean;
  /** Seen by someone who can't review: the state, no decisions. */
  readOnly?: boolean;
  busy: ReadonlySet<string>;
  onApprove: (l: ShowcaseListing) => void;
  onReject: (l: ShowcaseListing) => void;
  onRemove: (l: ShowcaseListing) => void;
}) {
  const sorted = [...listings].sort(
    (a, b) => Number(b.status === "pending") - Number(a.status === "pending") || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  const tiles = sorted.map((l) => {
          const pending = l.status === "pending";
          return (
            <div key={l.id} data-listing={l.id} className={cn("flex flex-col gap-2", !pending && "opacity-60")}>
              <Tile
                app={l}
                badge={
                  <span
                    className={cn(
                      "inline-flex rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold shadow-md",
                      pending ? "bg-amber-700 text-white" : "bg-foreground text-background",
                    )}
                  >
                    {pending ? "Awaiting review" : "Turned down"}
                  </span>
                }
              />
              {/* Waiting: just the two decisions, from the left edge. Turned
                  down: the reason on the left, Remove on the right. */}
              <div
                className={cn(
                  "flex items-start gap-3 px-1 text-[0.78rem] text-muted-foreground",
                  pending ? "justify-start" : "justify-between",
                )}
              >
                {!pending && (
                  <div className="min-w-0">
                    {l.rejectionReason && <span className="block break-words">“{l.rejectionReason}”</span>}
                  </div>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  {readOnly ? null : pending ? (
                    <>
                      <Button size="sm" className="h-9 sm:h-8" disabled={busy.has(l.id)} onClick={() => onApprove(l)} aria-label={`Approve ${l.name}`}>
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 sm:h-8" disabled={busy.has(l.id)} onClick={() => onReject(l)} aria-label={`Reject ${l.name}`}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <LinkButton danger onClick={() => onRemove(l)} className="min-h-9 sm:min-h-0" aria-label={`Remove ${l.name}`}>
                      Remove
                    </LinkButton>
                  )}
                </div>
              </div>
            </div>
          );
  });

  if (bare) return <>{tiles}</>;
  return (
    <div className="sc">
      <div className="sc-gal !pb-0">{tiles}</div>
    </div>
  );
}
