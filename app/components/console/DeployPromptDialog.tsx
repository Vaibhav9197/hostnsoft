"use client";

import { Button, buttonVariants } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { COPIED_LABEL, CopyPromptButton } from "../CopyPromptButton";
import { CONSOLE_DEPLOY_PROMPT, consoleDeployPromptFor } from "@/app/lib/deployPrompt";

/**
 * Hands the visitor the deploy prompt to paste into their agent.
 *
 * Shared rather than written twice: the apps list opens it to create an app,
 * and a project's nav opens it to redeploy an existing one. Same prompt, same
 * copy behaviour — only the wording around it differs, so that's all either
 * caller passes.
 *
 * The prompt is the console form, without the landing-page arm header: whoever
 * is looking at this is already signed in, so their marketing-visit cookie says
 * nothing about where the deploy came from.
 */
export function DeployPromptDialog({
  open,
  onClose,
  title,
  description,
  appSlug,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  /** Names the app in the prompt, so a redeploy lands on this one rather than
   *  creating a second app. Omitted by the apps list, which has no app yet. */
  appSlug?: string | null;
}) {
  const prompt = appSlug ? consoleDeployPromptFor(appSlug) : CONSOLE_DEPLOY_PROMPT;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-elevated p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {prompt}
        </pre>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          {/* The shared copy button owns the clipboard behaviour and the
              copied-state flip; it only needs the primary button's styling. */}
          <CopyPromptButton
            text={prompt}
            className={buttonVariants()}
            copiedChildren={COPIED_LABEL}
            onCopied={onClose}
          >
            Copy
          </CopyPromptButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
