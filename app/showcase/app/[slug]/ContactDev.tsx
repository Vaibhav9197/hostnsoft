"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * "Contact Dev": the app page's main button and its form. Only the app slug
 * is sent; the server looks up who to deliver to. Spam protection is
 * invisible — a hidden field people never see and a minimum fill time.
 */
export function ContactDev({ slug, appName, creatorName }: { slug: string; appName: string; creatorName: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const openedAt = useRef(0);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      openedAt.current = Date.now();
      setStatus({ kind: "idle" });
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/showcase/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
          website: form.get("website"),
          openedAt: openedAt.current,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Couldn’t send your message.");
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Couldn’t send your message." });
    }
  }

  const field =
    "w-full rounded-xl border border-[var(--line-control)] bg-[var(--surface)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)]";
  const first = creatorName.trim().split(/\s+/)[0] || "the developer";

  return (
    <>
      <button type="button" className="sc-btn lg" onClick={() => onOpenChange(true)}>
        <Mail aria-hidden="true" />
        Contact Dev
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* transform:none — an older stylesheet on public pages also turns the
            centring classes into a transform, which doubled the offset. */}
        <DialogContent className="max-w-md bg-[var(--surface)] text-[var(--ink)]" style={{ transform: "none" }}>
          {status.kind === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 aria-hidden="true" className="size-9 text-[var(--ok)]" />
              <DialogTitle className="text-xl font-bold">Message sent</DialogTitle>
              <DialogDescription className="text-[var(--ink-soft)]">
                {first} will reply to the email you gave.
              </DialogDescription>
              <button type="button" className="ds-btn mt-2" onClick={() => onOpenChange(false)}>
                Done
              </button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Contact {first}</DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Ask about {appName}, share feedback, or say hello. Your email is only used to reply.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate={false}>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Name
                  <input name="name" required maxLength={120} autoComplete="name" className={field} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Email
                  <input name="email" type="email" required autoComplete="email" className={field} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Message
                  <textarea name="message" required minLength={10} maxLength={4000} rows={5} className={`${field} resize-y`} />
                </label>

                {/* Honeypot: off-screen and skipped by keyboard and screen
                    readers, so only bots fill it. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label>
                    Website
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                {status.kind === "error" && (
                  <p role="alert" className="text-sm text-[var(--danger)]">
                    {status.message}
                  </p>
                )}

                <button type="submit" className="ds-btn ds-btn-pri mt-1 w-full" disabled={status.kind === "sending"}>
                  {status.kind === "sending" ? "Sending…" : "Send message"}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
