"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { HnsError } from "../../lib/client";
import { customerQueryApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";

/**
 * Get in touch from inside the console. Unlike the public form on the marketing
 * site, this one asks for no email address — the API reads it off the verified
 * session — so the whole thing is one choice and one box.
 */

const TYPES = [
  { value: "feedback", label: "Feedback" },
  { value: "feature", label: "Feature" },
] as const;

type QueryType = (typeof TYPES)[number]["value"];

export function HeaderContactButton() {
  const { activeCompanyId } = useSession();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QueryType>("feedback");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start clean every time it opens, including after a previous send.
  useEffect(() => {
    if (!open) return;
    setType("feedback");
    setMessage("");
    setBusy(false);
    setSent(false);
    setError(null);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
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
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Send us feedback">
        <MessageSquare aria-hidden="true" />
        {/* The plan chip shares this row on narrow screens. */}
        <span className="hidden sm:inline">Contact</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get in touch</DialogTitle>
            <DialogDescription>
              {sent
                ? "Thanks — we read every one of these."
                : "Tell us what’s missing or what’s in your way. We’ll reply to your account email."}
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <DialogFooter>
              <DialogClose render={<Button type="button" />}>Done</DialogClose>
            </DialogFooter>
          ) : (
            <form onSubmit={submit} className="grid gap-5">
              {error && <div className="text-sm font-medium text-destructive">{error}</div>}

              <div className="grid gap-1.5">
                <span id="contact-type" className="text-sm font-semibold text-foreground">
                  Type
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="contact-type"
                  className="grid grid-cols-2 gap-1 rounded-md bg-accent p-1"
                >
                  {TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={type === value}
                      onClick={() => setType(value)}
                      disabled={busy}
                      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                        type === value
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="contact-message" className="text-sm font-semibold text-foreground">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  autoFocus
                  placeholder="What would you like us to build or fix?"
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={busy || !message.trim()}>
                  {busy ? "Sending…" : "Send"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
