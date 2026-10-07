"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel, Tag } from "@/app/components/console/kit";
import { ApprovalCodeDialog } from "@/app/components/console/showcase/ApprovalCodeDialog";
import { Button } from "@/app/components/ui/button";
import { showcaseApi } from "@/app/lib/hnsApi";
import { formatDate } from "@/app/lib/format";
import { SITE_HOST } from "@/app/lib/site";
import type { ShowcaseListing } from "@/app/lib/types";

/**
 * The Showcase pages this app is on, shown on the app's Overview.
 *
 * Renders nothing until the app is on at least one page: an empty panel would
 * only add weight to the page. Each row links to its page; managing a listing
 * happens on Showcase itself.
 */
export function ProjectShowcasePages({
  companyId,
  projectId,
}: {
  companyId: string | null;
  projectId: string;
}) {
  const [listings, setListings] = useState<ShowcaseListing[] | null>(null);
  /* The waiting listing whose code is being entered, if any. */
  const [codeFor, setCodeFor] = useState<ShowcaseListing | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    showcaseApi
      .listMySubmissions(companyId, projectId)
      .then((mine) => !cancelled && setListings(mine))
      // Secondary to the page: if Showcase can't load, leave the section out.
      .catch(() => !cancelled && setListings([]));
    return () => {
      cancelled = true;
    };
  }, [companyId, projectId]);

  if (!listings || listings.length === 0) return null;

  /* Same shape as Traffic above it: the section title sits on the page, and
     the card holds only the pages. That keeps the heading, the one-line reason
     and the rows on three clearly different levels. */
  return (
    <section className="flex flex-col gap-3.5">
      <div>
        {/* Manage sits inline with the title: changing or removing a listing
            lives on Showcase itself, and this section only says where the app is. */}
        <h2 className="text-[1.05rem] font-bold text-foreground">
          On Showcase{" "}
          <span className="text-[0.84rem] font-normal text-muted-foreground">
            (
            <Link href="/app/showcase" className="transition-colors hover:text-foreground hover:underline">
              Manage
            </Link>
            )
          </span>
        </h2>
        <p className="mt-0.5 text-[0.85rem] text-muted-foreground">
          This app is listed on these public Showcase pages.
        </p>
      </div>
      <Panel>
        <ul className="divide-y divide-border">
          {listings.map((l) => {
            const pagePath = l.collection.type === "public" ? "/showcase" : `/showcase/${l.collection.slug}`;
            const pageUrl = `${SITE_HOST}${pagePath}`;
            const pageName = l.collection.type === "public" ? "Embarko Showcase" : l.collection.title;
            return (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-[0.95rem] font-semibold text-foreground">{pageName}</span>
                  {l.status === "pending" && <Tag tone="scheduled">Awaiting approval</Tag>}
                  {l.status === "rejected" && <Tag>Turned down</Tag>}
                  {l.isPrivate && <Tag>Hidden by organiser</Tag>}
                </div>
                <p className="mt-0.5 font-mono text-[0.75rem] text-muted-foreground">
                  {/* The address is the link, as with the app's own URL in the
                      header: it is what the reader recognises and goes to. */}
                  <a
                    href={pagePath}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground hover:underline"
                  >
                    {pageUrl}
                  </a>{" "}
                  · added {formatDate(l.createdAt)}
                </p>
                {l.status === "rejected" && (
                  <p className="mt-1 text-[0.8rem] text-muted-foreground">
                    {l.rejectionReason ? `Organiser: “${l.rejectionReason}”` : "The organiser turned it down."} Submit
                    again with the event’s code, or after fixing it.
                  </p>
                )}
              </div>
              {/* Only while waiting: a code from the organiser puts it on the
                  page now, without listing it again through the AI. */}
              {l.status === "pending" && (
                <Button variant="outline" size="sm" onClick={() => setCodeFor(l)}>
                  I have an approval code
                </Button>
              )}
            </li>
            );
          })}
        </ul>
      </Panel>

      <ApprovalCodeDialog
        companyId={companyId}
        listing={codeFor}
        onClose={() => setCodeFor(null)}
        onApproved={(updated) => {
          setListings((ls) => ls?.map((x) => (x.id === updated.id ? updated : x)) ?? ls);
          setCodeFor(null);
          toast.success(`Approved — ${updated.name} is on ${updated.collection.title} now.`);
        }}
      />
    </section>
  );
}
