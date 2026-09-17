"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UploadDeployPanel } from "./UploadDeployPanel";
import { COPIED_LABEL, CopyPromptButton } from "../CopyPromptButton";
import { CONSOLE_DEPLOY_PROMPT, consoleDeployPromptFor } from "@/app/lib/deployPrompt";
import { useSession } from "@/app/lib/session";

/**
 * The two ways to get an app onto Embarko, in one place.
 *
 * Shared rather than written twice: the apps list opens it to create an app,
 * and a project's nav opens it to redeploy an existing one. Same prompt, same
 * copy behaviour — only the wording around it differs, so that's all either
 * caller passes.
 *
 * The prompt is the console form, without the landing-page arm header: whoever
 * is looking at this is already signed in, so their marketing-visit cookie says
 * nothing about where the deploy came from.
 *
 * Handing the agent a prompt stays the default, because it is the path that
 * keeps working afterwards — the agent that deployed can also fix and redeploy.
 * Uploading is for whoever already has the app built and would rather not go
 * through an agent at all.
 */

type Start = "prompt" | "upload";

export function DeployPromptDialog({
  open,
  onClose,
  title,
  description,
  appSlug,
  onDeployed,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  /** Names the app in the prompt, so a redeploy lands on this one rather than
   *  creating a second app. Omitted by the apps list, which has no app yet. */
  appSlug?: string | null;
  /** Lets the caller pick up a freshly uploaded app — the list reloads, the
   *  project page re-reads its status. */
  onDeployed?: () => void;
}) {
  const { activeCompanyId } = useSession();
  const prompt = appSlug ? consoleDeployPromptFor(appSlug) : CONSOLE_DEPLOY_PROMPT;
  const [start, setStart] = useState<Start>("prompt");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={start} onValueChange={(value) => setStart(value as Start)}>
          <TabsList variant="line">
            <TabsTrigger value="prompt">Paste a prompt</TabsTrigger>
            <TabsTrigger value="upload">Upload file</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-3 flex flex-col gap-4">
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
          </TabsContent>

          {/* The upload panel carries its own Deploy button: it is only live
              once something has been packed, which the footer above has no way
              of knowing. */}
          <TabsContent value="upload" className="mt-3">
            <UploadDeployPanel
              companyId={activeCompanyId}
              appSlug={appSlug}
              onDeployed={(appName) => {
                toast.success(`Deploying ${appName}`, {
                  description: "The build runs in the background — it'll appear here once it's up.",
                });
                onDeployed?.();
                onClose();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
