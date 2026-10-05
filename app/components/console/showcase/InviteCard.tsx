"use client";

import { useId } from "react";

import { COPIED_LABEL, CopyPromptButton, PromptIcon } from "@/app/components/CopyPromptButton";
import { Panel } from "@/app/components/console/kit";
import { CopyButton } from "@/app/components/console/showcase/CopyButton";
import { buttonVariants } from "@/app/components/ui/button";
import { showcaseListPrompt } from "@/app/lib/showcasePrompt";
import { cn } from "@/app/lib/utils";

/**
 * How an event page's owner brings apps in: the page link, the prompt for
 * participants' AI, and whether that prompt carries the page's code.
 *
 * The code is what lets an app skip the owner's review, so it lives here,
 * next to the prompt it goes into, rather than in the page header. The link
 * never carries it: anyone arriving from a shared link waits for approval.
 */
export function InviteCard({
  page,
  origin,
  includeCode,
  onIncludeCodeChange,
  heading,
}: {
  page: { slug: string; title: string; submitCode?: string | null };
  origin: string | null;
  includeCode: boolean;
  onIncludeCodeChange: (next: boolean) => void;
  /** The card's title area — "No apps yet", the just-created celebration, or "Invite participants". */
  heading: React.ReactNode;
}) {
  const checkboxId = useId();
  const code = page.submitCode ?? null;

  return (
    <Panel padded>
      {heading}
      <p className="text-[0.9rem] text-muted-foreground">
        Invite participants to add their apps. Share the page link, or send the prompt and their AI adds the app for
        them.
      </p>

      {code && (
        <div className="mt-4 flex items-start gap-2.5">
          <input
            id={checkboxId}
            type="checkbox"
            checked={includeCode}
            onChange={(e) => onIncludeCodeChange(e.target.checked)}
            className="mt-[3px] size-4 shrink-0 cursor-pointer accent-[var(--ink)]"
          />
          <div className="min-w-0">
            <label htmlFor={checkboxId} className="cursor-pointer text-[0.9rem] text-foreground">
              Include the code in the prompt, so apps go on the page without my review
            </label>
            <div className="flex items-center gap-1 text-[0.8rem] text-muted-foreground">
              Code <span className="font-mono text-foreground">{code}</span>
              <CopyButton
                iconOnly
                text={code}
                aria-label="Copy page code"
                announce="Code copied."
                fallbackLabel="Page code to copy"
                variant="ghost"
                className="size-11 shrink-0 text-muted-foreground hover:text-foreground sm:size-7"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <CopyButton
          text={`${origin ?? ""}/showcase/${page.slug}`}
          announce="Link copied."
          fallbackLabel="Page link to copy"
          variant="default"
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          Share link
        </CopyButton>
        <CopyPromptButton
          text={showcaseListPrompt(
            { slug: page.slug, title: page.title, type: "event" },
            null,
            includeCode ? code : null,
          )}
          announce="Prompt copied."
          copiedChildren={COPIED_LABEL}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full sm:h-9 sm:w-auto")}
        >
          <PromptIcon aria-hidden="true" />
          Share prompt to add app
        </CopyPromptButton>
      </div>
    </Panel>
  );
}
