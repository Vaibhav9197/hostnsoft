"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";

import { CopyPromptButton } from "../CopyPromptButton";
import { Button } from "../ui/button";
import { tokensApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";
import { CONSOLE_DEPLOY_PROMPT, consoleKeepPromptWithToken } from "../../lib/deployPrompt";

/** How long the page keeps listening after a copy before it offers help. */
const PATIENCE_MS = 10 * 60 * 1000;

type Waiting = "deploy" | "keep";

/**
 * The dashboard with no apps yet. Most people land here straight after their
 * AI deployed an app without an account, so keeping that app leads; starting
 * a new one is the quiet second path.
 *
 * Claiming needs the account's deploy token inside the prompt: the person
 * generates one, sees it, then copies the prompt it rides in. After a copy the
 * page listens (the parent polls while `onWaitingChange` is true) and the app
 * card simply appears — no refresh, no second step.
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
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [slow, setSlow] = useState(false);
  /* Made once and reused, so "Copy again" or a second click never leaves a
     trail of tokens behind. */
  const [token, setToken] = useState<string | null>(null);
  const keepPrompt = token ? consoleKeepPromptWithToken(token) : null;
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkNow() {
    setChecking(true);
    try {
      await onCheckNow();
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    onWaitingChange(waiting !== null);
    if (!waiting) return;
    setSlow(false);
    const id = window.setTimeout(() => setSlow(true), PATIENCE_MS);
    return () => window.clearTimeout(id);
  }, [waiting, onWaitingChange]);

  async function generateToken() {
    if (!activeCompanyId) return;
    setError(null);
    setPreparing(true);
    try {
      const created = await tokensApi.create(activeCompanyId, "Claim my app");
      setToken(created.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t generate the token. Try again.");
    } finally {
      setPreparing(false);
    }
  }

  if (waiting) {
    const again = waiting === "deploy" ? CONSOLE_DEPLOY_PROMPT : keepPrompt ?? "";
    return (
      <div className="relative rounded-xl bg-card/50 px-6 py-14 text-center">
        <Button variant="ghost" size="sm" onClick={() => setWaiting(null)} className="absolute left-4 top-4 gap-1.5 text-muted-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <div className="mx-auto flex w-fit items-center gap-2 text-sm font-medium text-foreground" role="status" aria-live="polite">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ok)]" />
          </span>
          {waiting === "deploy" ? "Waiting for your AI to deploy…" : "Waiting for your AI to claim your app…"}
        </div>
        {/* Quiet on purpose: the page already checks every few seconds, so
            this is for the impatient, not a step. */}
        <div className="mt-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={checkNow} disabled={checking} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
            <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
            {checking ? "Checking…" : "Check now"}
          </Button>
        </div>
        <p className="mx-auto mt-4 max-w-[46ch] text-[0.92rem] text-muted-foreground">
          {slow
            ? "Still waiting. Make sure the prompt was pasted into your AI agent and it's running."
            : waiting === "keep"
              ? "Paste the prompt into the same AI chat that deployed your app. It will appear here on its own."
              : "Paste the prompt into Claude, Cursor or any AI agent. Your app will appear here on its own."}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <CopyPromptButton text={again} className="underline underline-offset-4 hover:text-foreground" copiedChildren="Copied">
            Copy prompt again
          </CopyPromptButton>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card/50 px-6 py-14 text-center">
      <h3 className="text-[1.1rem] font-bold text-foreground">Claim your already deployed app</h3>

      {/* Two steps on purpose: make the token, then copy the prompt that
          carries it. */}
      {!keepPrompt ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={generateToken}
            disabled={preparing || !activeCompanyId}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-70"
          >
            {preparing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <KeyRound className="size-4" aria-hidden="true" />}
            {preparing ? "Preparing…" : "Get my claim prompt"}
          </button>
        </div>
      ) : (
        <div className="mx-auto mt-5 max-w-md">
          <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-center font-mono text-sm break-all text-foreground">
            {token}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">The prompt already includes the token.</p>
          <div className="mt-4 flex justify-center">
            <CopyPromptButton
              text={keepPrompt}
              onCopied={() => setWaiting("keep")}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy claim prompt
            </CopyPromptButton>
          </div>
          {/* 5: the agent that deployed the app still has it, so the chat matters. */}
          <p className="mt-3 text-center text-xs text-muted-foreground">Paste it into the same AI chat that deployed your app.</p>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <p className="mx-auto mt-10 max-w-md border-t border-border pt-6 text-[0.9rem] text-muted-foreground">
        New app?{" "}
        <CopyPromptButton
          text={CONSOLE_DEPLOY_PROMPT}
          onCopied={() => setWaiting("deploy")}
          className="ml-2 inline-flex items-center gap-1.5 font-semibold text-foreground underline underline-offset-4"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copy deploy prompt
        </CopyPromptButton>
      </p>
    </div>
  );
}
