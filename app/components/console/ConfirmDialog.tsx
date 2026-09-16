"use client";

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

/**
 * One destructive-or-notable action, described in the words the user needs to
 * decide. `onConfirm` runs after the dialog closes.
 */
export type ConfirmRequest = {
  title: string;
  body?: React.ReactNode;
  /** Label on the button that goes ahead — a verb, not "OK". */
  cta: string;
  /** Red CTA. On for anything that destroys or interrupts something live. */
  destructive?: boolean;
  /** Label on the way out. Defaults to "Keep as is". */
  dismiss?: string;
  onConfirm: () => void;
};

/**
 * Shared confirmation step for actions that can't be taken back with a second
 * click. Driven by a nullable request rather than a boolean so the copy is
 * still on screen through the close animation, and so a page can describe the
 * specific thing at hand ("Remove app.example.com?") instead of "Are you sure?".
 *
 * Not for the heaviest actions: deleting an app asks you to type its name,
 * because a dialog you can dismiss by reflex isn't enough of a speed bump.
 */
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={request != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          {request?.body && <DialogDescription>{request.body}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{request?.dismiss ?? "Keep as is"}</DialogClose>
          <Button
            variant={request?.destructive ? "destructive" : "default"}
            onClick={() => {
              const run = request?.onConfirm;
              onClose();
              run?.();
            }}
          >
            {request?.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
