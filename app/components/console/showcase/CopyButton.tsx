"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/lib/utils";

const RESET_MS = 1800;

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * A plain "copy this text" button for the share kit: the link, the WhatsApp
 * message, the add-an-app link.
 *
 * It only claims a copy that happened. Where the clipboard is blocked (an
 * insecure origin, a denied permission, an old browser) it says so and puts
 * the text in a selected, read-only field right under the button, so the
 * organiser can copy it by hand instead of wondering why nothing pasted.
 *
 * Renders as siblings (button, live region, fallback), so the fallback lands
 * in whatever row holds the button; it takes a full row of its own there.
 */
export function CopyButton({
  text,
  children,
  announce,
  iconOnly,
  fallbackLabel = "Text to copy",
  "aria-label": ariaLabel,
  variant = "outline",
  size,
  className,
}: {
  text: string;
  /** The resting label, after the copy icon. Ignored when `iconOnly`. */
  children?: React.ReactNode;
  /** Read out on a successful copy, e.g. "Link copied." */
  announce: string;
  iconOnly?: boolean;
  /** Names the select-it-yourself field shown when the copy fails, e.g.
      "Page link to copy". */
  fallbackLabel?: string;
  "aria-label"?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(0);
  const fallbackRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const noteId = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!failed) return;
    fallbackRef.current?.focus();
    fallbackRef.current?.select();
  }, [failed]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCopied(false);
      setFailed(true);
      return;
    }
    setFailed(false);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), RESET_MS);
  }

  const Icon = copied ? Check : Copy;
  const multiline = text.includes("\n");

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size ?? (iconOnly ? "icon-sm" : "default")}
        className={className}
        onClick={copy}
        aria-label={ariaLabel}
      >
        <Icon aria-hidden="true" />
        {!iconOnly && (copied ? "Copied" : children)}
      </Button>
      {/* The label swap is visual; this is how it reaches a screen reader. */}
      <output className="sr-only" aria-live="polite">
        {copied ? announce : ""}
      </output>
      {failed && (
        <div className="w-full min-w-0 basis-full">
          <p id={noteId} className="text-[0.8rem] text-muted-foreground">
            Couldn’t copy. Select it and copy it yourself.
          </p>
          {/* A textarea for multi-line text: an input would quietly drop the
              line breaks, and the WhatsApp message needs them. */}
          {multiline ? (
            <textarea
              ref={fallbackRef}
              readOnly
              value={text}
              aria-label={fallbackLabel}
              aria-describedby={noteId}
              rows={Math.min(8, text.split("\n").length)}
              className={cn(
                "mt-1.5 w-full resize-none border border-input bg-transparent px-3 py-2 font-mono text-[0.8rem] text-foreground shadow-sm outline-none",
                "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            />
          ) : (
            <Input
              ref={fallbackRef}
              readOnly
              value={text}
              aria-label={fallbackLabel}
              aria-describedby={noteId}
              className="mt-1.5 font-mono text-[0.8rem] md:text-[0.8rem]"
            />
          )}
        </div>
      )}
    </>
  );
}
