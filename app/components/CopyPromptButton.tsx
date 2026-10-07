"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WandSparkles } from "lucide-react";

import { currentDeployPrompt } from "@/app/lib/deployPrompt";

/**
 * The one button that puts the Embarko deploy prompt on the clipboard.
 *
 * Every "copy the prompt" affordance on the site routes through this, so the
 * prompt text has exactly one home (app/lib/deployPrompt.ts) and the copy
 * behaviour — the copied-state flip, its reset, the failure case, and the
 * screen-reader announcement — is written once instead of five times.
 *
 * The landing-page variants look nothing alike, so this owns behaviour only:
 * appearance comes from `className` and `children`, with `copiedClassName` and
 * `copiedChildren` supplying the post-copy state.
 *
 * The props are deliberately all serializable — no render props, no function
 * className. Some callers (app/v1) are server components, and React cannot pass
 * a function across the server/client boundary.
 */

const RESET_MS = 1800;

/** The icon on every "copy a prompt" button, and only on those. A magic wand,
    not the plain copy icon, so the one action that hands work to an AI looks
    the same everywhere. Copying anything else (a token, a link) keeps Copy. */
export const PromptIcon = WandSparkles;

/** What every copy button says once the prompt is on the clipboard. Exported
    so the label, like the prompt itself, has one place to change. */
export const COPIED_LABEL = "Paste in your agent";

type Props = Omit<React.ComponentProps<"button">, "onClick"> & {
  /** Shown once the prompt is on the clipboard. Falls back to `children`. */
  copiedChildren?: React.ReactNode;
  /** Replaces `className` in the copied state. Falls back to `className`. */
  copiedClassName?: string;
  /** Fires only on a successful copy — e.g. to advance a step. */
  onCopied?: () => void;
  /** Fires after every click, copied or not. For flows that must keep moving
      even where the clipboard is unavailable, such as the v2 demo. */
  onClicked?: () => void;
  /** How long the copied state shows before reverting. */
  resetMs?: number;
  /** What to put on the clipboard. Defaults to the prompt for the page the
      visitor is on; pass CONSOLE_DEPLOY_PROMPT for the signed-in console. */
  text?: string;
  /** What a screen reader hears once the copy lands. Defaults to the deploy
      prompt's wording; pass one for any other prompt. */
  announce?: string;
  /** Shown for a moment when the clipboard refused the copy. Without it a
      blocked copy changes nothing on screen (the default, for every caller
      that predates it). */
  failedChildren?: React.ReactNode;
  /** What a screen reader hears when the copy was refused. */
  failedAnnounce?: string;
};

export function CopyPromptButton({
  children,
  copiedChildren,
  className,
  copiedClassName,
  onCopied,
  onClicked,
  resetMs = RESET_MS,
  text,
  announce = "Deploy prompt copied to clipboard.",
  failedChildren,
  failedAnnounce,
  ...props
}: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = useCallback(async () => {
    let ok = true;
    try {
      /* Resolved at click time, not module load: the arm comes from a cookie,
         so reading it any earlier would bake in whatever was true during the
         server render. */
      await navigator.clipboard.writeText(text ?? currentDeployPrompt());
    } catch {
      /* Blocked clipboard (insecure origin, denied permission). Don't claim a
         copy that did not happen — but still let onClicked run. */
      ok = false;
    }
    window.clearTimeout(timerRef.current);
    if (ok) {
      setFailed(false);
      setCopied(true);
      onCopied?.();
      timerRef.current = window.setTimeout(() => setCopied(false), resetMs);
    } else {
      setCopied(false);
      setFailed(true);
      timerRef.current = window.setTimeout(() => setFailed(false), resetMs);
    }
    onClicked?.();
  }, [onCopied, onClicked, resetMs, text]);

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={(copied && copiedClassName) || className}
        {...props}
      >
        {copied && copiedChildren !== undefined
          ? copiedChildren
          : failed && failedChildren !== undefined
            ? failedChildren
            : children}
      </button>
      {/* The label swap is visual; this is how it reaches a screen reader. */}
      <output className="sr-only" aria-live="polite">
        {copied ? announce : failed && failedAnnounce ? failedAnnounce : ""}
      </output>
    </>
  );
}
