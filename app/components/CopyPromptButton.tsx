"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  ...props
}: Props) {
  const [copied, setCopied] = useState(false);
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
    if (ok) {
      setCopied(true);
      onCopied?.();
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), resetMs);
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
        {copied && copiedChildren !== undefined ? copiedChildren : children}
      </button>
      {/* The label swap is visual; this is how it reaches a screen reader. */}
      <output className="sr-only" aria-live="polite">
        {copied ? "Deploy prompt copied to clipboard." : ""}
      </output>
    </>
  );
}
