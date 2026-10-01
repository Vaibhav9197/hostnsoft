"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Loader2, RefreshCw } from "lucide-react";

import { CopyPromptButton } from "../CopyPromptButton";
import { Button } from "../ui/button";
import { tokensApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";
import { CONSOLE_DEPLOY_PROMPT, consoleDeployPromptWithToken, consoleKeepPromptWithToken } from "../../lib/deployPrompt";

/** How long the page keeps listening after a copy before it offers help. */
const PATIENCE_MS = 10 * 60 * 1000;

type Waiting = "deploy" | "keep";
type Answer = "new" | "keep";

/**
 * The dashboard with no apps yet. Two kinds of people land here: someone new,
 * and someone whose AI already deployed an app before they signed in — an app
 * that is deleted after 24 hours unless it moves into their account.
 *
 * The page can't tell them apart, so it asks — one plain question — and each
 * answer leads straight to its one prompt. Either prompt carries the account's
 * deploy token, so the AI needs nothing else; the token is made when the
 * answer is picked and never shown. After a copy the page listens (the parent
 * polls while `onWaitingChange` is true) and the app card simply appears.
 */
export function FirstAppEmpty({
  onWaitingChange,
  onCheckNow,
}: {
  onWaitingChange: (waiting: boolean) => void;
  /** Re-read the apps list right away, for anyone who won't wait for the poll. */
  onCheckNow: () => Promise<void> | void;
}) {
  const { activeCompanyId } = useSession();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [slow, setSlow] = useState(false);
  /* Made once and reused, so changing the answer or copying again never
     leaves a trail of tokens behind. */
  const [token, setToken] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  /* Without a token the new-app prompt still works — the AI asks for one —
     but keeping an app can't, so that path waits for it. */
  const deployPrompt = token ? consoleDeployPromptWithToken(token) : CONSOLE_DEPLOY_PROMPT;
  const keepPrompt = token ? consoleKeepPromptWithToken(token) : null;

  useEffect(() => {
    onWaitingChange(waiting !== null);
    if (!waiting) return;
    setSlow(false);
    const id = window.setTimeout(() => setSlow(true), PATIENCE_MS);
    return () => window.clearTimeout(id);
  }, [waiting, onWaitingChange]);

  /* Made as soon as an answer is picked, so the Copy click that follows can
     write to the clipboard straight away — browsers refuse a write that
     waits on a request. */
  async function choose(next: Answer) {
    setAnswer(next);
    if (token || preparing || !activeCompanyId) return;
    setError(null);
    setPreparing(true);
    try {
      const created = await tokensApi.create(activeCompanyId, next === "keep" ? "Keep my app" : "First deploy");
      setToken(created.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t prepare your prompt. Try again.");
    } finally {
      setPreparing(false);
    }
  }

  if (waiting) {
    const again = waiting === "deploy" ? deployPrompt : keepPrompt ?? "";
    return (
      <div className="relative rounded-xl bg-card/50 px-6 py-14 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 text-sm font-medium text-foreground" role="status" aria-live="polite">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ok)]" />
          </span>
          {waiting === "deploy" ? "Waiting for your AI to deploy…" : "Waiting for your AI to move your app…"}
        </div>
        <p className="mx-auto mt-4 max-w-[46ch] text-[0.92rem] text-muted-foreground">
          {slow
            ? "Still waiting. Make sure the prompt was pasted into your AI agent and it's running."
            : waiting === "keep"
              ? "Paste the prompt into the same AI chat that deployed your app. It will appear here on its own."
              : "Paste the prompt into Claude, Cursor or any AI agent. Your app will appear here on its own."}
        </p>
        {/* Quiet on purpose: the page already checks every few seconds, so
            these are for the impatient, not steps. */}
        <div className="mt-4 flex justify-center gap-1">
          <CopyPromptButton
            text={again}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            copiedChildren={
              <>
                <Check className="size-3.5" aria-hidden="true" />
                Copied
              </>
            }
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Copy again
          </CopyPromptButton>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setChecking(true);
              try {
                await onCheckNow();
              } finally {
                setChecking(false);
              }
            }}
            disabled={checking}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <RefreshCw className={`size-3.5 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            {checking ? "Checking…" : "Check now"}
          </Button>
        </div>
      </div>
    );
  }

  const primary =
    "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-70";
  const secondary =
    "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-control px-5 text-sm font-semibold text-foreground hover:bg-accent";

  /* ------------------------------------------------------------- question */
  if (!answer) {
    return (
      <div className="rounded-xl bg-card/50 px-6 py-14 text-center">
        <h3 className="text-[1.1rem] font-bold text-foreground">Did you deploy an app without signing in?</h3>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={() => void choose("new")} className={primary}>
            No, I’m new
          </button>
          <button type="button" onClick={() => void choose("keep")} className={secondary}>
            Yes
          </button>
        </div>
      </div>
    );
  }

  const back = (label: string) => (
    <button
      type="button"
      onClick={() => setAnswer(null)}
      className="mx-auto mt-8 inline-flex items-center gap-1.5 text-[0.84rem] text-muted-foreground hover:text-foreground hover:underline"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );

  /* -------------------------------------------------------------- new app */
  if (answer === "new") {
    return (
      <div className="flex flex-col rounded-xl bg-card/50 px-6 py-14 text-center">
        <h3 className="text-[1.1rem] font-bold text-foreground">Deploy your first app</h3>
        <div className="mt-5 flex justify-center">
          <CopyPromptButton
            text={deployPrompt}
            onCopied={() => setWaiting("deploy")}
            disabled={preparing}
            className={primary}
          >
            {preparing ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            Copy Embarko prompt
          </CopyPromptButton>
        </div>
        <ol className="mx-auto mt-5 flex flex-col gap-1 text-[0.9rem] text-muted-foreground sm:flex-row sm:gap-6">
          <li>1. Paste it into your AI</li>
          <li>2. Ask it to deploy</li>
          <li>3. It appears here</li>
        </ol>
        {back("Back")}
      </div>
    );
  }

  /* ------------------------------------------------------------- keep app */
  return (
    <div className="flex flex-col rounded-xl bg-card/50 px-6 py-14 text-center">
      <h3 className="text-[1.1rem] font-bold text-foreground">Keep that app</h3>
      <p className="mx-auto mt-2 max-w-[56ch] text-[0.92rem] text-muted-foreground">
        It’s deleted after 24 hours unless you move it into your account.
      </p>
      <div className="mt-5 flex justify-center">
        <CopyPromptButton
          text={keepPrompt ?? ""}
          onCopied={() => setWaiting("keep")}
          announce="Prompt copied."
          disabled={!keepPrompt}
          className={primary}
        >
          {keepPrompt ? <Copy className="size-4" aria-hidden="true" /> : <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          Copy prompt
        </CopyPromptButton>
      </div>
      <p className="mt-3 text-[0.84rem] text-foreground">Paste it into the same AI chat that deployed it.</p>
      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}{" "}
          <button type="button" onClick={() => void choose("keep")} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      )}
      {back("Not sure? Start over")}
    </div>
  );
}
