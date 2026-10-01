"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";

import { Button } from "../ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "../ui/popover";
import { DictationButton, DictationStatus, useDictation } from "../ui/dictation";
import { HnsError } from "../../lib/client";
import { customerQueryApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";

/**
 * Get in touch from inside the console, as a chat-style widget pinned to the
 * bottom-right corner. Unlike the public form on the marketing site, this one
 * asks for no email address — the API reads it off the verified session — so
 * the whole thing is one choice and one box.
 */

// "What's missing" leads: that is what the launcher invites, so the panel
// opens on the tab the user was already aiming at.
const TYPES = [
  { value: "feature", label: "Say what’s missing" },
  { value: "feedback", label: "Feedback" },
] as const;

type QueryType = (typeof TYPES)[number]["value"];

export function FeedbackWidget() {
  const { activeCompanyId } = useSession();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QueryType>("feature");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  // Speech lands in the box as ordinary text, so it stays editable afterwards.
  const appendTranscript = useCallback((text: string) => {
    setMessage((current) => {
      const needsSpace = current.length > 0 && !/\s$/.test(current);
      return (current + (needsSpace ? " " : "") + text).slice(0, 2000);
    });
  }, []);
  const dictation = useDictation({ onTranscript: appendTranscript });
  const startDictation = dictation.start;
  const stopDictation = dictation.stop;

  // A click anywhere outside closes a popover, so an unsent draft survives
  // closing and reopening. Only a finished send starts the next one clean.
  function handleOpenChange(next: boolean) {
    if (next && sent) {
      setType("feature");
      setMessage("");
      setBusy(false);
      setSent(false);
      setError(null);
    }
    setOpen(next);
  }

  // Never leave the mic live behind a closed panel.
  useEffect(() => {
    if (!open) stopDictation();
  }, [open, stopDictation]);

  // Sending swaps the form, and the focused Send button with it, for the
  // thank-you. Hand focus to Done so keyboard and screen-reader users land
  // somewhere instead of on the popup itself.
  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    stopDictation();
    setBusy(true);
    setError(null);
    try {
      await customerQueryApi.create(activeCompanyId, type, message.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof HnsError ? err.message : "Couldn’t send that. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        onClick={() => {
          // Armed inside the click itself, not in an effect afterwards:
          // browsers only start speech recognition — and the permission prompt
          // behind it — from a real user gesture. Tap the mic to go quiet.
          // Not while a send is in flight or finished: the mic button is
          // disabled or gone then, so there would be no way to turn it off.
          if (!open && !busy && !sent) startDictation(true);
        }}
        aria-label="Say what’s missing or share feedback"
        className="fixed bottom-4 right-4 z-40 inline-flex h-9 items-center justify-center gap-2 border border-control bg-card px-3 text-sm font-medium text-foreground shadow-lg outline-none transition-colors hover:border-[color:color-mix(in_srgb,var(--ink)_45%,transparent)] hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] sm:bottom-6 sm:right-6 sm:px-3"
      >
        {open ? (
          <X aria-hidden="true" className="size-4" />
        ) : (
          <MessageSquare aria-hidden="true" className="size-4" />
        )}
        {/* Icon-only on phones, where it would otherwise cover content. */}
        <span className="hidden sm:inline">What’s missing?</span>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        positionMethod="fixed"
        initialFocus={textareaRef}
        className="grid max-h-[var(--available-height)] w-[min(24rem,calc(100vw-2rem))] gap-4 overflow-y-auto p-5"
      >
        <div className="grid gap-1.5 pr-8">
          <PopoverTitle className="text-lg leading-tight">Help us build Embarko</PopoverTitle>
          <PopoverDescription>
            {sent
              ? "Got it. Thanks for building Embarko with us."
              : "It goes straight to the team building Embarko and shapes what we ship next."}
          </PopoverDescription>
        </div>

        <PopoverClose
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 size-8 text-faint hover:text-foreground"
            />
          }
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </PopoverClose>

        {sent ? (
          <div className="flex justify-end">
            <PopoverClose render={<Button ref={doneRef} type="button" />}>Done</PopoverClose>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            {error && <div className="text-sm font-medium text-destructive">{error}</div>}

            <div
              role="radiogroup"
              aria-label="Type"
              className="grid grid-cols-2 gap-1 bg-accent p-1"
            >
              {TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={type === value}
                  onClick={() => setType(value)}
                  disabled={busy}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    type === value
                      ? "bg-elevated-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label htmlFor="contact-message" className="sr-only">
              Message
            </label>
            <textarea
              ref={textareaRef}
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="What would you like us to build or fix?"
              className="w-full resize-none border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <DictationStatus state={dictation.state} interim={dictation.interim} />

            <div className="flex items-center justify-between gap-2">
              <DictationButton
                listening={dictation.listening}
                supported={dictation.supported}
                disabled={busy}
                onToggle={dictation.toggle}
              />
              <Button type="submit" disabled={busy || !message.trim()}>
                {busy ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
