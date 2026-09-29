"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";

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
  /* The claim prompt went onto the clipboard on its own once the token was
     made; from then on the page listens for the claimed app. */
  const [claimCopied, setClaimCopied] = useState(false);
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
    onWaitingChange(waiting !== null || claimCopied);
    if (!waiting) return;
    setSlow(false);
    const id = window.setTimeout(() => setSlow(true), PATIENCE_MS);
    return () => window.clearTimeout(id);
  }, [waiting, claimCopied, onWaitingChange]);

  async function generateToken() {
    if (!activeCompanyId) return;
    setError(null);
    setPreparing(true);
    try {
      /* Held for a beat so the scramble reads as "making your key", not a flicker. */
      const [created] = await Promise.all([
        tokensApi.create(activeCompanyId, "Claim my app"),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
      setToken(created.token);
      try {
        await navigator.clipboard.writeText(consoleKeepPromptWithToken(created.token));
        setClaimCopied(true);
      } catch {
        // The browser refused (the click is a moment old); the button below finishes it.
      }
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
        <div className="mx-auto flex w-fit items-center gap-2 text-sm font-medium text-foreground" role="status" aria-live="polite">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ok)]" />
          </span>
          {waiting === "deploy" ? "Waiting for your AI to deploy…" : "Waiting for your AI to claim your app…"}
        </div>
        <p className="mx-auto mt-4 max-w-[46ch] text-[0.92rem] text-muted-foreground">
          {slow
            ? "Still waiting. Make sure the prompt was pasted into your AI agent and it's running."
            : waiting === "keep"
              ? "Paste the prompt into the same AI chat that deployed your app. It will appear here on its own."
              : "Paste the prompt into Claude, Cursor or any AI agent. Your app will appear here on its own."}
        </p>
        {/* Quiet on purpose: the page already checks every few seconds, so
            this is for the impatient, not a step. */}
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => { setChecking(true); window.location.assign("/app"); }} disabled={checking} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
            <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
            {checking ? "Checking…" : "Check now"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card/50 px-6 py-14 text-center">
      <h3 className="text-[1.1rem] font-bold text-foreground">Claim your already deployed app</h3>

      {/* Two steps on purpose: make the token, then copy the prompt that
          carries it. */}
      {preparing ? (
        <div className="mx-auto mt-5 max-w-2xl" role="status" aria-live="polite">
          <ScrambleToken />
          <p className="mt-2 text-center text-xs text-muted-foreground">Generating token…</p>
        </div>
      ) : !keepPrompt ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={generateToken}
            disabled={preparing || !activeCompanyId}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-70"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            Get my claim prompt
          </button>
        </div>
      ) : (
        <div className="mx-auto mt-5 max-w-2xl">
          <div className="px-3 py-2 text-center font-mono text-sm break-all text-foreground">
            {token}
          </div>
          <div className="mt-4 flex justify-center">
            {claimCopied ? (
              <p className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--ok-ink)]" role="status">
                <Check className="size-5" aria-hidden="true" />
                Claim prompt copied including token
              </p>
            ) : (
              <CopyPromptButton
                text={keepPrompt}
                onCopied={() => setClaimCopied(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
              >
                <Copy className="size-4" aria-hidden="true" />
                Copy claim prompt
              </CopyPromptButton>
            )}
          </div>
          {/* 5: the agent that deployed the app still has it, so the chat matters. */}
          <p className="mt-3 text-center text-xs text-foreground">Paste it into the same AI chat that deployed your app.</p>
          {claimCopied && (
            <div className="mt-3 flex justify-center">
              {/* A full reload of /app: the plainest "show me what's there now". */}
              <Button variant="ghost" size="sm" onClick={() => { setChecking(true); window.location.assign("/app"); }} disabled={checking} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
                <RefreshCw className={`size-3.5 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                {checking ? "Checking…" : "Check now"}
              </Button>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      {/* Once a token is made the job is claiming; a second path would only distract. */}
      {!token && !preparing && (
        <p className="mx-auto mt-8 max-w-md text-[0.9rem] text-muted-foreground">
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
      )}
    </div>
  );
}

const SCRAMBLE = "abcdef0123456789";

/* A made-up token that keeps changing while the real one is made. Decoration
   only: screen readers hear "Generating token…" beside it instead. */
function ScrambleToken() {
  const [text, setText] = useState(() => randomToken());
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setText(randomToken()), 180);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div aria-hidden="true" className="px-3 py-2 text-center font-mono text-sm break-all text-muted-foreground">
      {text}
    </div>
  );
}

function randomToken(): string {
  let out = "emb_";
  for (let i = 0; i < 64; i++) out += SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
  return out;
}
