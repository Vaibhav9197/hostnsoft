"use client";

import "@/app/showcase/showcase.css";
import { Tile } from "@/app/showcase/kit";

import { LinkButton, Tag } from "@/app/components/console/kit";
import { Button } from "@/app/components/ui/button";
import type { ShowcaseListing } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";

/**
 * Apps submitted to an event page that aren't on it yet: pending ones wait
 * for Approve / Reject, rejected ones stay here (dimmed, with the reason)
 * until removed or resubmitted. Same tiles as ListingRows, so a request
 * looks like what it will become.
 */
export function RequestRows({
  listings,
  busy,
  onApprove,
  onReject,
  onRemove,
}: {
  listings: ShowcaseListing[];
  busy: ReadonlySet<string>;
  onApprove: (l: ShowcaseListing) => void;
  onReject: (l: ShowcaseListing) => void;
  onRemove: (l: ShowcaseListing) => void;
}) {
  const sorted = [...listings].sort(
    (a, b) => Number(b.status === "pending") - Number(a.status === "pending") || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <div className="sc">
      <div className="sc-gal !pb-0">
        {sorted.map((l) => {
          const pending = l.status === "pending";
          return (
            <div key={l.id} data-listing={l.id} className={cn("flex flex-col gap-2", !pending && "opacity-60")}>
              <Tile app={l} />
              <div className="flex items-start justify-between gap-3 px-1 text-[0.78rem] text-muted-foreground">
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 [&>span]:ml-0">
                    {pending ? <Tag tone="scheduled">Awaiting review</Tag> : <Tag>Turned down</Tag>}
                  </span>
                  <span className="mt-1 block truncate">by {l.creatorName}</span>
                  {!pending && l.rejectionReason && <span className="mt-0.5 block break-words">“{l.rejectionReason}”</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {pending ? (
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
        })}
      </div>
    </div>
  );
}
