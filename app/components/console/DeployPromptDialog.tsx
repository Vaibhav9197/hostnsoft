"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UploadDeployPanel } from "./UploadDeployPanel";
import { DeploySteps } from "./DeploySteps";
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
 * The prompt path is the four steps in DeploySteps — the same ones the empty
 * apps page shows, so the two never tell it differently.
 *
 * Uploading is for whoever already has the app built and would rather not go
 * through an agent at all, and it is the route the agent guide gives chat-only
 * AI tools (no terminal, no connector): they hand the person a .zip for it.
 */

type Start = "prompt" | "upload";

/** The agent guide's upload route (route 4) points here: hiding it strands
 *  chat-only agents. */
const SHOW_UPLOAD = true;

export function DeployPromptDialog({
  open,
  onClose,
  title,
  description,
  appSlug,
  projectId,
  onDeployed,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  /** Names the app in the prompt, so a redeploy lands on this one rather than
   *  creating a second app. Omitted by the apps list, which has no app yet. */
  appSlug?: string | null;
  /** The app being updated. Step 4 follows whichever app the AI deploys,
   *  but if two change at once, this one wins. */
  projectId?: string | null;
  /** Lets the caller pick up a freshly uploaded app — the list reloads, the
   *  project page re-reads its status. */
  onDeployed?: () => void;
}) {
  const { activeCompanyId } = useSession();
  const [start, setStart] = useState<Start>("prompt");

  const steps = (
    <div className="mt-1">
      <DeploySteps
        mode={appSlug ? "update" : "new"}
        appSlug={appSlug}
        projectId={projectId}
        active={open}
        onEvent={() => onDeployed?.()}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!SHOW_UPLOAD ? (
          steps
        ) : (
          <Tabs value={start} onValueChange={(value) => setStart(value as Start)}>
            <TabsList variant="line">
              <TabsTrigger value="prompt">Paste a prompt</TabsTrigger>
              <TabsTrigger value="upload">Upload file</TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="mt-3">
              {steps}
            </TabsContent>

            {/* The upload panel carries its own Deploy button: it is only
                live once something has been packed. */}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
