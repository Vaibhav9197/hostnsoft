"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, KeyRound, Loader2, X } from "lucide-react";

import { Button, buttonVariants } from "../ui/button";
import { CopyPromptButton, PromptIcon } from "../CopyPromptButton";
import { agentIconSrc } from "@/app/lib/agents";
import {
  CONSOLE_DEPLOY_PROMPT,
  consoleDeployPromptFor,
  consoleDeployPromptWithToken,
  consoleKeepPromptWithToken,
} from "@/app/lib/deployPrompt";
import { tokensApi } from "@/app/lib/hnsApi";
import { useDeployWatch, type DeployWatch } from "./useDeployWatch";
import { useSession } from "@/app/lib/session";
import { appHost, appUrl } from "@/app/lib/site";
import { cn } from "@/app/lib/utils";

/**
 * Getting an app online, told as four steps on a dotted line: a deploy key,
 * copy the prompt, paste it into your AI, the app goes live. Only the first
 * two are things to do here; the last two show what happens next, so it's
 * clear what the prompt is for before anyone copies it. The key goes into the
 * prompt and is never shown, and neither is the prompt text: both are for
 * the AI, not the person.
 *
 * Copying ends the person's part, so the view changes with it: the steps fold
 * into one "Prompt copied" line and the space goes to the deploy's state
 * (useDeployWatch) — waiting for the AI, deploying, starting, live or failed.
 * Before the copy this answers "what do I do?"; after it, "what's happening?".
 * Waiting is shown as waiting, not as a step: the panel can't see the paste,
 * so nothing claims the deploy has started until it has.
 *
 * One component for every place this happens, so they can't drift:
 * - "new": the Host new app dialog, and the empty apps page for someone new.
 * - "update": a project's "Prompt to update this app" — names the app.
 * - "keep": the empty apps page for someone whose AI deployed an app before
 *   they signed in. Keeping it is a redeploy with this account's key, so here
 *   the key is required, not optional: there is no prompt without it.
 */

export type DeployMode = "new" | "update" | "keep";

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

export function DeploySteps({
  mode,
  appSlug,
  projectId,
  active = true,
  onEvent,
  onTrackingChange,
  doneAction,
}: {
  mode: DeployMode;
  /** "update" only: names the app in the prompt, so the redeploy lands on it
   *  rather than creating a second app. */
  appSlug?: string | null;
  /** "update" only: if two apps change at once, step 4 follows this one. */
  projectId?: string | null;
  /** False while hidden (a closed dialog): the watch stops, and showing it
   *  again starts from the copy step. */
  active?: boolean;
  /** The deploy was first seen, went live, or failed. */
  onEvent?: (event: "seen" | "live" | "failed") => void;
  /** The view switched between the steps and the deploy's state, so a
   *  caller can hide its own navigation while the state view has its own. */
  onTrackingChange?: (tracking: boolean) => void;
  /** A second button beside Open app once the app is live — where the
   *  caller wants the person to go next. */
  doneAction?: { label: string; onClick: () => void };
}) {
  const { activeCompanyId } = useSession();
  const keyRequired = mode === "keep";
  /* Made once and reused, so reopening or copying again never leaves a trail
     of keys behind. */
  const [token, setToken] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Copying moves the highlight on to pasting, and it stays there: the person
     has moved on to their AI. */
  const [copied, setCopied] = useState(false);
  const { watch, start: startWatch, stop: stopWatch } = useDeployWatch({
    companyId: activeCompanyId,
    preferProjectId: projectId,
    onEvent,
  });
  useEffect(() => {
    if (active) {
      setCopied(false);
      setError(null);
    }
    stopWatch();
  }, [active, stopWatch]);

  const prompt =
    mode === "keep"
      ? token
        ? consoleKeepPromptWithToken(token)
        : null
      : mode === "update"
        ? consoleDeployPromptFor(appSlug, token)
        : token
          ? consoleDeployPromptWithToken(token)
          : CONSOLE_DEPLOY_PROMPT;

  /* Its own click, before Copy: browsers refuse a clipboard write that waits
     on a request, so the key has to exist by the time Copy is pressed. */
  async function makeKey() {
    if (token || making || !activeCompanyId) return;
    setError(null);
    setMaking(true);
    try {
      const label = mode === "keep" ? "Keep my app" : mode === "update" ? `Update ${appSlug}` : "Deploy an app";
      const created = await tokensApi.create(activeCompanyId, label);
      setToken(created.token);
      /* A prompt copied before had no key in it. Put Copy back as the next
         move, so the one pasted is the one with the key. */
      setCopied(false);
    } catch {
      setError("Couldn’t create your deploy key.");
    } finally {
      setMaking(false);
    }
  }

  /* Back to the steps, e.g. to add a key: the watch ends with the view. */
  function backToSteps() {
    stopWatch();
    setCopied(false);
  }

  const tracking = copied && !!prompt;
  const onTrackingChangeRef = useRef(onTrackingChange);
  onTrackingChangeRef.current = onTrackingChange;
  useEffect(() => {
    onTrackingChangeRef.current?.(tracking);
  }, [tracking]);

  if (tracking) {
    return (
      <Tracking
        mode={mode}
        watch={watch}
        prompt={prompt}
        canAddKey={!token}
        doneAction={doneAction}
        onCopyAgain={() => void startWatch()}
        onBack={backToSteps}
      />
    );
  }

  /* Optional key: without one the prompt tells the AI to use a key it already
     saved, or ask for one, so it never blocks Copy. Required key (keep): Copy
     waits for it, and the key is the first move. */
  const keyState: StepState = token ? "done" : keyRequired ? "current" : "todo";
  const copyState: StepState = prompt ? "current" : "todo";

  return (
    <ol>
      <Step
        title={token ? "Deploy key added" : keyRequired ? "Create a deploy key" : "Add a deploy key"}
        state={keyState}
        optional={!token && !keyRequired}
      >
        {token ? (
          <>
            It’s inside your prompt — you never need to see it.{" "}
            <Link href="/app/tokens" className="text-foreground underline underline-offset-2 hover:no-underline">
              Manage keys
            </Link>
          </>
        ) : (
          <>
            {keyRequired
              ? "Your AI uses it to move the app into your account."
              : "Skip it if your AI has deployed to Embarko before. If it hasn’t, a key saves it asking you for one."}
            <div className="mt-3">
              <Button
                variant={keyRequired ? "default" : "outline"}
                onClick={() => void makeKey()}
                disabled={making || !activeCompanyId}
                className={keyRequired ? "h-10 px-5" : "h-9 px-4"}
              >
                {making ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <KeyRound aria-hidden="true" />
                )}
                {making ? "Creating…" : "Create deploy key"}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-[0.84rem] text-[var(--danger)]" role="alert">
                {error}{" "}
                <button type="button" onClick={() => void makeKey()} className="underline underline-offset-2">
                  Try again
                </button>
              </p>
            )}
          </>
        )}
      </Step>

      <Step title={mode === "update" ? "Copy the update prompt" : "Copy the prompt"} state={copyState}>
        {prompt ? (
          <div className="mt-2">
            <CopyPromptButton
              text={prompt}
              className={cn(buttonVariants(), "h-10 px-5")}
              announce="Prompt copied. Paste it into your AI."
              onCopied={() => {
                setCopied(true);
                void startWatch();
              }}
            >
              <PromptIcon aria-hidden="true" />
              Copy prompt
            </CopyPromptButton>
          </div>
        ) : (
          "Your deploy key goes inside it."
        )}
      </Step>

      <Step title={mode === "keep" ? "Paste it into the same AI chat" : "Paste it into your AI"} state="todo">
        {mode === "keep" ? (
          "The one that deployed your app. It knows which app it was."
        ) : (
          <>
            The same chat where you built your app.
            <AgentMarks />
          </>
        )}
      </Step>

      <Step
        title={mode === "keep" ? "Your app is yours to keep" : mode === "update" ? "The new version goes live" : "Your app goes live"}
        state="todo"
        last
      >
        {mode === "keep"
          ? "It stops expiring and shows up here, at the same link."
          : mode === "update"
            ? "Same link, new version. This shows it happen."
            : "Your AI sends you the link. This shows it happen."}
        {/* What the result looks like, so it isn't abstract. */}
        {mode !== "keep" && <LivePill slug={appSlug || "yourapp"} example />}
      </Step>
    </ol>
  );
}

/* Answers "does it work with my AI?" right where it comes up. */
function AgentMarks() {
  return (
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
  );
}

function LivePill({ slug, example }: { slug: string; example?: boolean }) {
  return (
    <span className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
      <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-[var(--ok)]">
        <Check className="size-3.5" aria-hidden="true" />
        Live
      </span>
      <span className={cn("truncate font-mono text-[0.78rem]", example ? "text-muted-foreground" : "text-foreground")}>
        {appHost(slug)}
      </span>
    </span>
  );
}

/* One stop on the timeline: a marker, then its words. The dotted line runs
   from this marker down to the next, so it stops at the last one.
   done → green check; current → filled circle; todo → hollow circle, words
   muted; failed → red cross. */
type StepState = "done" | "current" | "todo" | "failed";

function Step({
  title,
  state,
  optional,
  last,
  children,
}: {
  title: string;
  state: StepState;
  /** Can be skipped: still outlined, but its title reads at full strength
   *  and carries an "Optional" tag, so it doesn't look locked. */
  optional?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={cn("relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4", !last && "pb-6")}
      aria-current={state === "current" ? "step" : undefined}
    >
      {!last && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1 left-4 top-8 block w-1 -translate-x-1/2 transition-colors duration-300 motion-reduce:transition-none",
            state === "done" ? "text-[var(--ok)]" : "text-faint",
          )}
          style={DOTS}
        />
      )}
      {/* A plain circle, no number: the line already shows the order, and
          a number reads as one more thing to process. Finished steps keep
          their check; the ol still numbers them for screen readers. */}
      <span className="relative grid size-8 place-items-center">
        <span
          className={cn(
            "grid place-items-center rounded-full transition-colors duration-300 motion-reduce:transition-none",
            state === "done" && "size-6 bg-[var(--ok-soft)] text-[var(--ok)] ring-1 ring-[color-mix(in_srgb,var(--ok)_40%,transparent)]",
            state === "current" && "size-4 bg-foreground ring-4 ring-border",
            state === "todo" && "size-4 border-[1.5px] border-control bg-card",
            state === "failed" && "size-6 bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[color-mix(in_srgb,var(--danger)_40%,transparent)]",
          )}
        >
          {state === "done" && <Check className="size-3.5" strokeWidth={2.75} aria-hidden="true" />}
          {state === "failed" && <X className="size-3.5" strokeWidth={2.75} aria-hidden="true" />}
        </span>
        {state === "done" && <span className="sr-only">Done:</span>}
        {state === "failed" && <span className="sr-only">Failed:</span>}
      </span>
      <div className="min-w-0 pt-1">
        <p
          className={cn(
            "text-[0.98rem] font-semibold leading-tight tracking-tight",
            state === "todo" && !optional ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
          {optional && (
            <span className="ml-2 rounded-full border border-border px-1.5 py-px align-middle text-[0.68rem] font-medium tracking-normal text-muted-foreground">
              Optional
            </span>
          )}
        </p>
        {children && <div className="mt-1 text-[0.86rem] text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- tracking */

/* Where the deploy is, as three marks: the AI started, the build finished,
   the app is up. Static sites have no start-up, so Built and Live land
   together. */
const STAGES = ["Started", "Built", "Live"] as const;

function stageOf(watch: DeployWatch): { reached: number; failedAt: number | null } {
  switch (watch.phase) {
    case "deploying":
      return { reached: 1, failedAt: null };
    case "starting":
      return { reached: 2, failedAt: null };
    case "live":
      return { reached: 3, failedAt: null };
    case "failed":
      return watch.problem === "build" ? { reached: 1, failedAt: 1 } : { reached: 2, failedAt: 2 };
    default:
      return { reached: 0, failedAt: null };
  }
}

function Tracking({
  mode,
  watch,
  prompt,
  canAddKey,
  doneAction,
  onCopyAgain,
  onBack,
}: {
  mode: DeployMode;
  watch: DeployWatch;
  prompt: string;
  /** No key in the prompt yet, so "add one" is a real fix for a stall. */
  canAddKey: boolean;
  doneAction?: { label: string; onClick: () => void };
  onCopyAgain: () => void;
  onBack: () => void;
}) {
  /* The Copy button the person just pressed is gone; move focus to the
     status that replaced it, so keyboard and screen-reader users land on it. */
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    statusRef.current?.focus();
  }, []);

  const { reached, failedAt } = stageOf(watch);
  const slug = "project" in watch ? watch.project.slug : null;

  let icon: React.ReactNode;
  let title: string;
  let body: React.ReactNode = null;
  switch (watch.phase) {
    case "waiting":
      icon = (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--ok)] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ok)]" />
        </span>
      );
      title = "Waiting for your AI to start";
      body = watch.slow ? (
        mode === "keep" ? (
          "Nothing yet. Make sure you pasted it into the chat that deployed the app, and that it’s running."
        ) : (
          <>
            Nothing yet. If your AI says it’s done, it may have used a key from another workspace, or none.
            {canAddKey && (
              <>
                {" "}
                <button type="button" onClick={onBack} className="text-foreground underline underline-offset-2 hover:no-underline">
                  Add a deploy key
                </button>{" "}
                and paste the new prompt.
              </>
            )}
          </>
        )
      ) : (
        "This updates on its own as soon as your AI starts deploying."
      );
      break;
    case "deploying":
      icon = <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
      title = `Deploying ${slug}…`;
      body = "Building your app. Usually a minute or two.";
      break;
    case "starting":
      icon = <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
      title = `Starting ${slug}…`;
      body = "Built. Waiting for it to come up.";
      break;
    case "live":
      icon = <Check className="size-4 text-[var(--ok)]" strokeWidth={2.75} aria-hidden="true" />;
      title = mode === "keep" ? `${slug} is yours to keep` : `${slug} is live`;
      break;
    case "failed":
      icon = <X className="size-4 text-[var(--danger)]" strokeWidth={2.75} aria-hidden="true" />;
      title =
        watch.problem === "build"
          ? "The deploy didn’t work"
          : watch.problem === "crashed"
            ? `${slug} started, then stopped`
            : `${slug} didn’t start`;
      /* The AI got the same error back from its deploy, so the fix is its
         job — say that, rather than hand over a build log. */
      body =
        watch.problem === "build"
          ? "Your AI sees the error too. Ask it to fix the problem and deploy again."
          : "Ask your AI to check the app’s logs, fix it and deploy again.";
      break;
    default:
      /* No snapshot to watch against (the first read failed): say what
         happens next without claiming to follow it. */
      icon = <Check className="size-4" aria-hidden="true" />;
      title = "Your AI takes it from here";
      body = "It sends you the link when it’s done, and the app shows up here.";
  }

  return (
    <div>
      {/* Steps 1–3, folded: what was done, and the one thing left to do. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[0.9rem] font-semibold text-foreground">
          <span className="grid size-5 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)] ring-1 ring-[color-mix(in_srgb,var(--ok)_40%,transparent)]">
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </span>
          Prompt copied
        </span>
        <CopyPromptButton
          text={prompt}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
          copiedChildren={
            <>
              <Check aria-hidden="true" />
              Copied
            </>
          }
          announce="Prompt copied again."
          onCopied={onCopyAgain}
        >
          <PromptIcon aria-hidden="true" />
          Copy again
        </CopyPromptButton>
      </div>
      <p className="mt-2 text-[0.86rem] text-muted-foreground">
        {mode === "keep"
          ? "Paste it into the AI chat that deployed your app."
          : "Paste it into your AI — the same chat where you built your app."}
      </p>

      {/* The state, given the room: this is what the person is here for now. */}
      <div
        ref={statusRef}
        tabIndex={-1}
        aria-live="polite"
        className={cn(
          "mt-5 rounded-xl border bg-background p-5 outline-none",
          watch.phase === "live"
            ? "border-[color-mix(in_srgb,var(--ok)_40%,transparent)]"
            : watch.phase === "failed"
              ? "border-[color-mix(in_srgb,var(--danger)_40%,transparent)]"
              : "border-border",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
          <p className="text-[1.05rem] font-semibold leading-tight tracking-tight text-foreground">{title}</p>
        </div>
        {body && <p className="mt-1.5 pl-[1.875rem] text-[0.86rem] text-muted-foreground">{body}</p>}

        {watch.phase === "failed" && (
          <div className="pl-[1.875rem]">
            {watch.errorDetail && (
              <span className="mt-2 line-clamp-2 block rounded-md bg-card px-2.5 py-1.5 font-mono text-[0.75rem] text-muted-foreground">
                {watch.errorDetail}
              </span>
            )}
            <Link
              href={
                watch.problem === "build"
                  ? `/app/projects/${watch.project.id}/deployments`
                  : `/app/projects/${watch.project.id}`
              }
              className="mt-2 inline-block text-[0.86rem] text-foreground underline underline-offset-2 hover:no-underline"
            >
              See what happened
            </Link>
          </div>
        )}

        {watch.phase === "live" && (
          <div className="pl-[1.875rem]">
            <LivePill slug={watch.project.slug} />
            {/* Live is the moment all of this is for, so Open app leads. */}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={appUrl(watch.project.slug)}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants(), "h-10 px-5")}
              >
                Open app
                <ArrowUpRight aria-hidden="true" />
              </a>
              {doneAction && (
                <Button variant="outline" onClick={doneAction.onClick} className="h-10 px-5">
                  {doneAction.label}
                </Button>
              )}
            </div>
          </div>
        )}

        {watch.phase !== "idle" && (
          <ol className="mt-4 flex items-center gap-2 pl-[1.875rem] text-[0.75rem]" aria-label="Progress">
            {STAGES.map((label, i) => {
              const n = i + 1;
              const failed = failedAt === n;
              const done = !failed && reached >= n;
              return (
                <li key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn("h-px w-5", reached >= n && !failed ? "bg-[var(--ok)]" : "bg-border")}
                    />
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      failed ? "text-[var(--danger)]" : done ? "text-foreground" : "text-faint",
                    )}
                  >
                    {failed ? (
                      <X className="size-3" strokeWidth={3} aria-hidden="true" />
                    ) : done ? (
                      <Check className="size-3 text-[var(--ok)]" strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    )}
                    {label}
                    <span className="sr-only">{failed ? " — failed" : done ? " — done" : " — not yet"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex items-center gap-1.5 text-[0.84rem] text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to the steps
      </button>
    </div>
  );
}
