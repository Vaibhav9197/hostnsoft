"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";

import { CopyPromptButton } from "../CopyPromptButton";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Steps } from "./kit";
import { CONSOLE_DEPLOY_PROMPT, appNameFromLink, consoleKeepPrompt } from "../../lib/deployPrompt";

/** How long the page keeps listening after a copy before it offers help. */
const PATIENCE_MS = 10 * 60 * 1000;

type Waiting = { kind: "deploy" } | { kind: "keep"; name: string };

/**
 * The dashboard with no apps yet. Two jobs, in order of how often they come
 * up: deploy a first app, or keep one deployed before signing up. After a
 * copy the page listens (the parent polls while `onWaitingChange` is true) and
 * the app card simply appears — no refresh, no second step.
 */
export function FirstAppEmpty({ onWaitingChange }: { onWaitingChange: (waiting: boolean) => void }) {
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [slow, setSlow] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const [link, setLink] = useState("");

  const keepName = appNameFromLink(link);

  useEffect(() => {
    onWaitingChange(waiting !== null);
    if (!waiting) return;
    setSlow(false);
    const id = window.setTimeout(() => setSlow(true), PATIENCE_MS);
    return () => window.clearTimeout(id);
  }, [waiting, onWaitingChange]);

  if (waiting) {
    const again = waiting.kind === "deploy" ? CONSOLE_DEPLOY_PROMPT : consoleKeepPrompt(waiting.name);
    return (
      <div className="rounded-xl border border-dashed border-input bg-card/50 px-6 py-14 text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 text-sm font-medium text-foreground">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ok)]" />
          </span>
          {waiting.kind === "deploy" ? "Waiting for your AI to deploy…" : `Waiting for your AI to keep ${waiting.name}…`}
        </div>
        <p className="mx-auto max-w-[46ch] text-[0.92rem] text-muted-foreground">
          {slow
            ? "Still waiting. Make sure the prompt was pasted into your AI agent and it's running."
            : "Paste the prompt into Claude, Cursor or any AI agent. Your app will appear here on its own."}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <CopyPromptButton text={again} className="inline-flex h-9 items-center gap-2 rounded-md border border-control px-3 text-sm font-medium text-foreground hover:bg-accent" copiedChildren="Copied">
            <Copy className="size-4" aria-hidden="true" />
            Copy again
          </CopyPromptButton>
          <Button variant="ghost" onClick={() => setWaiting(null)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-input bg-card/50 px-6 py-14 text-center">
      <h3 className="text-[1.1rem] font-bold text-foreground">Your apps will appear here</h3>

      <div className="mt-5 flex justify-center">
        <CopyPromptButton
          text={CONSOLE_DEPLOY_PROMPT}
          onCopied={() => setWaiting({ kind: "deploy" })}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          <Copy className="size-4" aria-hidden="true" />
          Copy Embarko prompt
        </CopyPromptButton>
      </div>
      <Steps steps={["Paste into your AI", "Ask it to deploy", "Your app appears here"]} />

      <div className="mx-auto mt-10 max-w-md border-t border-border pt-6">
        {!keepOpen ? (
          <p className="text-[0.9rem] text-muted-foreground">
            Deployed before signing up?{" "}
            <button type="button" onClick={() => setKeepOpen(true)} className="font-semibold text-foreground underline underline-offset-4">
              Keep that app
            </button>
          </p>
        ) : (
          <form
            className="flex flex-col gap-2 text-left"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="keep-link" className="text-sm font-medium text-foreground">
              Paste your app&rsquo;s link
            </label>
            <div className="flex gap-2">
              <Input
                id="keep-link"
                autoFocus
                placeholder="my-app.embarko.app"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                aria-invalid={link.trim() !== "" && !keepName}
              />
              {keepName ? (
                <CopyPromptButton
                  text={consoleKeepPrompt(keepName)}
                  onCopied={() => setWaiting({ kind: "keep", name: keepName })}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-foreground px-3 text-sm font-semibold text-background hover:bg-foreground/90"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  Copy prompt to keep it
                </CopyPromptButton>
              ) : (
                <Button disabled className="shrink-0">
                  <Copy aria-hidden="true" />
                  Copy prompt to keep it
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {link.trim() !== "" && !keepName
                ? "That doesn’t look like an app link. It ends in .embarko.app."
                : "Apps deployed without an account are deleted 24 hours after they’re deployed."}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
