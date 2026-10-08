"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UploadDeployPanel } from "./UploadDeployPanel";
import { COPIED_LABEL, CopyPromptButton, PromptIcon } from "../CopyPromptButton";
import { agentIconSrc } from "@/app/lib/agents";
import { CONSOLE_DEPLOY_PROMPT, consoleDeployPromptFor } from "@/app/lib/deployPrompt";
import { useSession } from "@/app/lib/session";
import { appHost } from "@/app/lib/site";
import { cn } from "@/app/lib/utils";

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
 * The prompt path is told as three steps on a dotted line — copy, paste into
 * your AI, get a live link — the same story as the homepage, so it's clear
 * what the prompt is for before anyone copies it. The prompt text itself is
 * never shown: it's for the AI, not the person.
 *
 * Uploading is for whoever already has the app built and would rather not go
 * through an agent at all. It's hidden for now (SHOW_UPLOAD); the code stays.
 */

type Start = "prompt" | "upload";

/** Upload is parked, not removed: flip this to bring the tab back. */
const SHOW_UPLOAD = false;

/* The agents people recognise first; "or any agent" covers the rest. */
const AGENT_MARKS = [
  { slug: "claudecode", name: "Claude" },
  { slug: "codex", name: "Codex" },
  { slug: "cursor", name: "Cursor" },
];

/* Round dots on a vertical track, drawn as a background so the line
   stretches to any height. currentColor, so the class sets its tone. */
const DOTS: React.CSSProperties = {
  backgroundImage: "radial-gradient(circle, currentColor 1.2px, transparent 1.7px)",
  backgroundSize: "4px 9px",
  backgroundRepeat: "repeat-y",
  backgroundPosition: "center top",
};

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
  /* Copying moves the highlight to step 2, and it stays there: the person
     has moved on to their AI. Reset each time the dialog opens. */
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const steps = (
    <ol className="mt-2">
      <Step n={1} title="Copy the prompt" active={!copied}>
        <div className="mt-3">
          {/* The shared copy button owns the clipboard and the copied-state
              flip; it only needs the primary button's styling. */}
          <CopyPromptButton
            text={prompt}
            className={cn(buttonVariants(), "h-10 px-5")}
            copiedChildren={COPIED_LABEL}
            announce="Prompt copied. Paste it into your AI."
            onCopied={() => setCopied(true)}
          >
            <PromptIcon aria-hidden="true" />
            {appSlug ? "Copy update prompt" : "Copy prompt"}
          </CopyPromptButton>
        </div>
      </Step>
      <Step n={2} title={copied ? "Now paste it into your AI" : "Paste it into your AI"} active={copied}>
        The same chat where you built your app.
        {/* Answers "does it work with my AI?" right where it comes up. */}
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem]">
          {AGENT_MARKS.map((a) => (
            <span key={a.slug} className="inline-flex items-center gap-1.5 text-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
              <img src={agentIconSrc(a.slug)} alt="" aria-hidden="true" className="size-3.5 dark:invert" />
              {a.name}
            </span>
          ))}
          <span>or any agent</span>
        </span>
      </Step>
      <Step n={3} title={appSlug ? "The new version goes live" : "Your app goes live"} last>
        {appSlug
          ? "Same link, new version. Your AI tells you when it's done."
          : "Your AI puts it online and sends you the link. It shows up here too."}
        {/* What the result looks like, so it isn't abstract. */}
        <span className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
          <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-[var(--ok)]">
            <Check className="size-3.5" aria-hidden="true" />
            Live
          </span>
          <span className="truncate font-mono text-[0.78rem] text-foreground">{appHost(appSlug || "yourapp")}</span>
        </span>
      </Step>
    </ol>
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

/* One stop on the timeline: a numbered dot, then its words. The dotted line
   runs from this dot down to the next, so it stops at the last one. */
function Step({
  n,
  title,
  active,
  last,
  children,
}: {
  n: number;
  title: string;
  active?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className={cn("relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4", !last && "pb-6")}>
      {!last && (
        <span aria-hidden="true" className="absolute bottom-0 left-4 top-9 block w-1 -translate-x-1/2 text-faint" style={DOTS} />
      )}
      <span
        className={cn(
          "relative grid size-8 place-items-center rounded-full text-[0.85rem] font-bold transition-colors duration-300 motion-reduce:transition-none",
          active
            ? "bg-foreground text-background ring-4 ring-border/60"
            : "border border-border bg-card text-foreground",
        )}
      >
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-[0.98rem] font-semibold leading-tight tracking-tight text-foreground">{title}</p>
        {children && <div className="mt-1 text-[0.86rem] text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}
