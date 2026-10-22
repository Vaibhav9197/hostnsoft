"use client";

import { useId } from "react";

import { COPIED_LABEL, CopyPromptButton, PromptIcon } from "@/app/components/CopyPromptButton";
import { Panel } from "@/app/components/console/kit";
import { AutoApproveField } from "@/app/components/console/showcase/AutoApproveField";
import { CopyButton } from "@/app/components/console/showcase/CopyButton";
import { buttonVariants } from "@/app/components/ui/button";
import { showcaseListPrompt } from "@/app/lib/showcasePrompt";
import { cn } from "@/app/lib/utils";

/**
 * How an event page's owner brings apps in: the prompt for participants' AI,
 * and whether that prompt carries the page's code.
 *
 * The code is what lets an app skip the owner's review, so it lives here,
 * next to the prompt it goes into, rather than in the page header. With
 * auto-approve on nothing waits for review, so the code is left out.
 */
export function InviteCard({
  page,
  includeCode,
  onIncludeCodeChange,
  heading,
  onAutoApproveChange,
  savingAutoApprove,
  canManage = true,
}: {
  page: { slug: string; title: string; submitCode?: string | null; autoApprove?: boolean };
  includeCode: boolean;
  onIncludeCodeChange: (next: boolean) => void;
  onAutoApproveChange: (next: boolean) => void;
  savingAutoApprove?: boolean;
  /** False for someone who can't run the page: no auto-approve switch, and
   *  the prompt goes out without the code. */
  canManage?: boolean;
  /** The card's title area — "No apps yet", the just-created celebration, or "Invite participants". */
  heading: React.ReactNode;
}) {
  const checkboxId = useId();
  const code = page.autoApprove || !canManage ? null : (page.submitCode ?? null);

  return (
    <Panel padded>
      {heading}
      <p className="text-[0.9rem] text-muted-foreground">
        Send participants a prompt. Their AI adds the app for them.
      </p>

      {canManage && <div className="mt-5">
        <AutoApproveField
          checked={!!page.autoApprove}
          onChange={onAutoApproveChange}
          disabled={savingAutoApprove}
          codeSlot={
            code && (
              <div className="flex flex-col gap-2 text-[0.82rem] text-muted-foreground">
                <div className="flex items-center gap-1">
                  Apps sent with code <span className="font-mono text-foreground">{code}</span> skip review
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
                <label htmlFor={checkboxId} className="flex w-fit cursor-pointer items-center gap-2">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={includeCode}
                    onChange={(e) => onIncludeCodeChange(e.target.checked)}
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  Add the code to the prompt
                </label>
              </div>
            )
          }
        />
      </div>}

      <CopyPromptButton
        text={showcaseListPrompt(
          { slug: page.slug, title: page.title, type: "event" },
          null,
          includeCode ? code : null,
        )}
        announce="Prompt copied."
        copiedChildren={COPIED_LABEL}
        className={cn(buttonVariants({ variant: "default" }), "mt-5 h-11 w-full sm:h-9 sm:w-auto")}
      >
        <PromptIcon aria-hidden="true" />
        Share prompt to add app
      </CopyPromptButton>
    </Panel>
  );
}
