"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, MessageSquare, Triangle, X } from "lucide-react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
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
import { FEATURES } from "../../lib/features";
import { useFeatureBubble } from "../FeatureTiles";
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

// Shipped features can't be voted for, so the list is only what's still
// marked upcoming — the same list the landing pages promise nothing about.
const UPCOMING = FEATURES.filter((f) => f.upcoming);

// Votes live in their own table (feature_votes), not the customer-query
// inbox: a message is something someone wrote, a vote is a tally. The server
// keys them by the signed-in user, so each feature takes one vote per person.
async function votesRequest(init?: RequestInit): Promise<string[]> {
  const res = await fetch("/api/feature-votes", {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = (await res.json().catch(() => null)) as { voted?: string[]; error?: string } | null;
  if (!res.ok) throw new Error(data?.error ?? "Couldn’t send your votes. Please try again.");
  return Array.isArray(data?.voted) ? data.voted : [];
}

function UpcomingVotes({
  companyId,
  userId,
  onVoted,
}: {
  companyId: string | null;
  userId: string | null;
  /** The features just cast, so the message sent next can carry them. */
  onVoted: (ids: string[]) => void;
}) {
  // userId only re-reads the votes when the signed-in person changes.
  const [open, setOpen] = useState(false);
  const [voted, setVoted] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(0);
  // Hovering a tile opens the same "what it does" bubble as the website's
  // feature tiles; a click still only picks the tile.
  const { hoverProps, bubble, close: closeBubble } = useFeatureBubble();

  useEffect(() => {
    if (!userId) return setVoted([]);
    let live = true;
    votesRequest()
      .then((ids) => live && setVoted(ids))
      .catch(() => {
        // Unknown votes just leave every tile pickable; the server still
        // ignores a repeat, so nothing is double-counted.
      });
    return () => {
      live = false;
    };
  }, [userId]);

  const left = UPCOMING.filter((f) => !voted.includes(f.id));

  function handleOpenChange(next: boolean) {
    if (next) {
      setPicked([]);
      setError(null);
    } else {
      closeBubble();
    }
    setOpen(next);
  }

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function send() {
    if (!userId || picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const ids = await votesRequest({
        method: "POST",
        body: JSON.stringify({ features: picked, companyId }),
      });
      setVoted(ids);
      setJustSent(picked.length);
      onVoted(picked);
      closeBubble();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send your votes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const status =
    justSent > 0
      ? `Thanks — ${justSent} vote${justSent === 1 ? "" : "s"} sent`
      : left.length === 0
        ? "You’ve voted for all of them"
        : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 border border-border px-3 py-2.5 text-left transition-colors hover:bg-accent"
          />
        }
      >
        <Triangle aria-hidden="true" fill="currentColor" className="size-3.5 shrink-0 text-success" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">Upvote upcoming features</span>
          {status && <span className="block text-xs text-muted-foreground">{status}</span>}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Upvote upcoming features</DialogTitle>
          <DialogDescription>Pick what you want next. You can choose more than one.</DialogDescription>
        </DialogHeader>

        {error && <div className="text-sm font-medium text-destructive">{error}</div>}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {UPCOMING.map(({ id, label, Icon }) => {
            const done = voted.includes(id);
            const on = picked.includes(id);
            return (
              <li key={id} className="min-w-0" {...hoverProps(id)}>
                <button
                  type="button"
                  data-feature
                  aria-pressed={done || on}
                  disabled={done || busy}
                  onClick={() => toggle(id)}
                  className={`flex h-24 w-full flex-col justify-between rounded-xl border p-3.5 text-left transition-colors disabled:cursor-default ${
                    on
                      ? "border-foreground bg-card"
                      : done
                        ? "border-border bg-accent"
                        : "border-border bg-card hover:border-[color:color-mix(in_srgb,var(--ink)_45%,transparent)]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={`size-5 ${done ? "text-muted-foreground" : "text-foreground"}`}
                    />
                    {done ? (
                      <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Voted
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`flex size-5 items-center justify-center rounded-full border ${
                          on ? "border-foreground bg-foreground text-card" : "border-control"
                        }`}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[15px] font-semibold leading-tight ${done ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>
            Cancel
          </DialogClose>
          <Button type="button" onClick={send} disabled={busy || picked.length === 0}>
            {busy
              ? "Sending…"
              : picked.length > 0
                ? `Upvote ${picked.length}`
                : "Upvote"}
          </Button>
        </DialogFooter>
        {bubble}
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackWidget() {
  const { activeCompanyId, user } = useSession();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QueryType>("feature");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Votes cast since the last message. Sending a message ties them to it, so
  // the admin sees them on that message rather than on every one this person
  // ever sent.
  const [unsentVotes, setUnsentVotes] = useState<string[]>([]);
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
      const { id } = await customerQueryApi.create(activeCompanyId, type, message.trim());
      setSent(true);
      if (id && unsentVotes.length > 0) {
        const features = unsentVotes;
        setUnsentVotes([]);
        // Best effort: the message is in either way, and the votes still
        // count on the Feature Votes page if the link doesn't land.
        fetch("/api/feature-votes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryId: String(id), features }),
        }).catch(() => {});
      }
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

            <UpcomingVotes
              companyId={activeCompanyId}
              userId={user?.id ?? null}
              onVoted={(ids) => setUnsentVotes((current) => [...new Set([...current, ...ids])])}
            />

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
