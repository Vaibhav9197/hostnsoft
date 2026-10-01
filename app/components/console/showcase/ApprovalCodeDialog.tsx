"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { showcaseApi } from "@/app/lib/hnsApi";
import type { ShowcaseListing } from "@/app/lib/types";

/**
 * For a listing still waiting on the organiser: the person got the page's
 * code later, and enters it here instead of asking their AI to list again.
 *
 * Submitting the same app to the same page again updates its listing and
 * merges, so only the code and the required fields are sent — every other
 * detail stays as it was. A wrong code is not an error from the API; the
 * listing simply stays pending, so that is what this checks for.
 */
export function ApprovalCodeDialog({
  companyId,
  listing,
  onClose,
  onApproved,
}: {
  companyId: string | null;
  listing: ShowcaseListing | null;
  onClose: () => void;
  onApproved: (updated: ShowcaseListing) => void;
}) {
  const inputId = useId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listing) {
      setCode("");
      setError(null);
    }
  }, [listing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !listing || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await showcaseApi.submit(companyId, {
        collectionSlug: listing.collection.slug,
        code: code.trim(),
        projectId: listing.projectId,
        name: listing.name,
        tagline: listing.tagline,
        creatorName: listing.creatorName,
      });
      if (updated.status === "approved") {
        onApproved(updated);
      } else {
        setError("That code didn’t work. Check it with the organiser and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t check the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={listing !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="w-[calc(100%-32px)] p-5 sm:max-w-md sm:p-7">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="pr-10 leading-tight">Enter approval code</DialogTitle>
            <DialogDescription>
              The organiser of {listing?.collection.title ?? "this page"} gives out a code. With it, your app goes on the
              page straight away.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-[0.84rem] font-medium text-foreground">
              Approval code
            </label>
            <Input
              id={inputId}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. WYX5J3PQ"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="font-mono uppercase tracking-wider"
            />
            {error && (
              <p id={`${inputId}-error`} role="alert" className="text-[0.84rem] text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !code.trim()}>
              {busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Approve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
