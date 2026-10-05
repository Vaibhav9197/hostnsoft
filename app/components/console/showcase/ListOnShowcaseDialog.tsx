"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";

import { CopyPromptButton, PromptIcon } from "@/app/components/CopyPromptButton";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { showcaseApi } from "@/app/lib/hnsApi";
import { showcaseListPrompt } from "@/app/lib/showcasePrompt";
import { SITE_HOST } from "@/app/lib/site";
import type { Project, ShowcaseListing } from "@/app/lib/types";

/**
 * "List it" on Embarko Showcase, in one dialog with two paths.
 *
 * An app has no showcase details of its own; the only place they exist is a
 * listing it already has (usually on an event page). When one of those is
 * complete — name, tagline and a screenshot, the three things the public
 * gallery needs — we reuse it and list in one click. Otherwise the AI that
 * built the app fills them in, so the dialog hands over the prompt instead.
 */

type State =
  | { kind: "checking" }
  | { kind: "ready"; from: ShowcaseListing }
  | { kind: "listing"; from: ShowcaseListing }
  | { kind: "listed"; listing: ShowcaseListing }
  | { kind: "needsAi"; copied: boolean }
  | { kind: "error"; message: string; from: ShowcaseListing | null };

function complete(l: ShowcaseListing): boolean {
  return Boolean(l.name?.trim() && l.tagline?.trim() && l.screenshotUrl?.trim());
}

export function ListOnShowcaseDialog({
  project,
  companyId,
  page,
  onClose,
  onListed,
}: {
  /** The app to list; null keeps the dialog closed. */
  project: Project | null;
  companyId: string | null;
  /** The workspace's own page, which feeds the public gallery. */
  page: { slug: string; title: string; type: "public" | "event" };
  onClose: () => void;
  onListed: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    if (!project || !companyId) return;
    let cancelled = false;
    setState({ kind: "checking" });
    showcaseApi
      .listMySubmissions(companyId, project.id)
      .then((listings) => {
        if (cancelled) return;
        const from = listings.find(complete) ?? null;
        setState(from ? { kind: "ready", from } : { kind: "needsAi", copied: false });
      })
      .catch(() => {
        // Can't tell whether details exist, so fall back to the path that
        // always works.
        if (!cancelled) setState({ kind: "needsAi", copied: false });
      });
    return () => {
      cancelled = true;
    };
  }, [project, companyId]);

  async function list(from: ShowcaseListing) {
    if (!companyId || !project) return;
    setState({ kind: "listing", from });
    try {
      const listing = await showcaseApi.submit(companyId, {
        collectionSlug: page.slug,
        projectId: project.id,
        name: from.name,
        tagline: from.tagline,
        description: from.description ?? undefined,
        story: from.story ?? undefined,
        creatorName: from.creatorName,
        creatorProfile: from.creatorProfile ?? undefined,
        builtWith: from.builtWith ?? undefined,
        category: from.category ?? undefined,
        tags: from.tags,
        videoUrl: from.videoUrl ?? undefined,
        screenshotUrl: from.screenshotUrl ?? undefined,
      });
      setState({ kind: "listed", listing });
      onListed();
    } catch {
      setState({ kind: "error", message: "Couldn’t list it. Try again.", from });
    }
  }

  const name = project?.name ?? "";
  /* Where it lands, in words: the gallery, or the event page by name. */
  const where = page.type === "public" ? "Embarko Showcase" : page.title;
  const whereUrl = page.type === "public" ? `${SITE_HOST}/showcase` : `${SITE_HOST}/showcase/${page.slug}`;

  return (
    <Dialog open={project !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-32px)] p-5 sm:p-7">
        {state.kind === "checking" && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words pr-10 leading-tight">List {name}</DialogTitle>
              <DialogDescription>Checking its details…</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6" role="status" aria-label="Checking its details">
              <Loader2 className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
            </div>
          </>
        )}

        {(state.kind === "ready" || state.kind === "listing" || (state.kind === "error" && state.from)) && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words pr-10 leading-tight">List {name} on {where}</DialogTitle>
              <DialogDescription>
                Its details are already filled in. It goes live on {whereUrl} straight away.
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const from = state.kind === "error" ? state.from! : state.from;
              return (
                <div className="flex gap-3 border border-border bg-elevated p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={from.screenshotUrl ?? ""}
                    alt=""
                    className="size-16 shrink-0 border border-border object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{from.name}</div>
                    <p className="mt-0.5 line-clamp-2 text-[0.84rem] text-muted-foreground">{from.tagline}</p>
                    <p className="mt-1 text-[0.78rem] text-faint">by {from.creatorName}</p>
                  </div>
                </div>
              );
            })()}
            {state.kind === "error" && (
              <p className="text-sm text-destructive" role="alert">
                {state.message}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => list(state.kind === "error" ? state.from! : state.from)}
                disabled={state.kind === "listing"}
              >
                {state.kind === "listing" && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {state.kind === "listing" ? "Listing…" : `List on ${where}`}
              </Button>
            </div>
          </>
        )}

        {state.kind === "listed" && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words pr-10 leading-tight">
                {state.listing.status === "pending" ? `${name} is awaiting approval` : `${name} is live`}
              </DialogTitle>
              <DialogDescription>
                {state.listing.status === "pending"
                  ? `The organiser of ${where} reviews it first. It appears on ${whereUrl} once approved.`
                  : `It’s on ${whereUrl} now, with a page of its own.`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
              <Button asChild>
                <a href={`/showcase/app/${state.listing.slug}`} target="_blank" rel="noreferrer">
                  View its page
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            </div>
          </>
        )}

        {state.kind === "needsAi" && project && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words pr-10 leading-tight">Let your AI list {name}</DialogTitle>
              <DialogDescription>
                It needs a short description and a screenshot first. The AI that built it can fill those in from the code.
              </DialogDescription>
            </DialogHeader>
            <ol className="flex flex-col gap-2 text-[0.9rem] text-foreground">
              {["Copy the prompt", `Paste it into the AI chat that built ${name}`, "It appears here once it’s listed"].map((step, i) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full border border-current text-[0.65rem] font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose}>
                {state.copied ? "Done" : "Cancel"}
              </Button>
              <CopyPromptButton
                text={showcaseListPrompt({ slug: page.slug, title: page.title, type: page.type }, project.slug)}
                onCopied={() => setState({ kind: "needsAi", copied: true })}
                className="inline-flex h-9 items-center justify-center gap-2 bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
                copiedChildren={
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Copied
                  </>
                }
              >
                <PromptIcon className="size-4" aria-hidden="true" />
                Copy prompt for your AI
              </CopyPromptButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
