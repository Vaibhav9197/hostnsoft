"use client";

import { useEffect, useState } from "react";
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
import { Input } from "../ui/input";
import { HnsError } from "../../lib/client";
import { companiesApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";
import type { CompanyMembershipSummary } from "../../lib/types";

export type CompanyDialogMode = "new" | "rename" | "delete";

// Create / rename / delete a company. Shared by the Switch Company page (and
// anywhere else that manages companies). Handles the API call + session reload;
// `onDone` reports what happened so the caller can navigate.
export function CompanyDialog({
  mode,
  company,
  onClose,
  onDone,
}: {
  mode: CompanyDialogMode | null;
  company: CompanyMembershipSummary | null;
  onClose: () => void;
  onDone?: (result: { createdId?: string; deletedId?: string }) => void;
}) {
  const { reload, setActiveCompanyId } = useSession();
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time a dialog opens.
  useEffect(() => {
    if (!mode) return;
    setName(mode === "rename" ? company?.companyName ?? "" : "");
    setConfirm("");
    setError(null);
    setBusy(false);
  }, [mode, company?.companyName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "new") {
        const created = await companiesApi.create(name.trim());
        await reload();
        setActiveCompanyId(created.id);
        onDone?.({ createdId: created.id });
      } else if (mode === "rename" && company) {
        await companiesApi.rename(company.companyId, name.trim());
        await reload();
        onDone?.({});
      } else if (mode === "delete" && company) {
        await companiesApi.remove(company.companyId);
        await reload();
        onDone?.({ deletedId: company.companyId });
      }
      onClose();
    } catch (e) {
      setError(e instanceof HnsError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const title = mode === "new" ? "New workspace" : mode === "rename" ? "Rename workspace" : "Delete workspace";
  const nameInvalid = !name.trim() || (mode === "rename" && name.trim() === company?.companyName);
  const deleteBlocked = confirm !== company?.companyName;

  return (
    <Dialog open={mode !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "delete" ? (
              <>
                Deleting <b className="text-foreground">{company?.companyName}</b> can’t be undone. This is
                blocked while the workspace still has any apps — delete or transfer them first.
              </>
            ) : mode === "new" ? (
              "Create a workspace to hold its own apps, members and deploy tokens."
            ) : (
              "Rename this workspace. Apps and members are unaffected."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-5">
          {error && <div className="text-sm font-medium text-destructive">{error}</div>}

          {mode === "delete" ? (
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">Type “{company?.companyName}” to confirm</label>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus placeholder={company?.companyName} />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">Workspace name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus placeholder="e.g. Acme Robotics" />
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button
              type="submit"
              variant={mode === "delete" ? "destructive" : "default"}
              disabled={busy || (mode === "delete" ? deleteBlocked : nameInvalid)}
            >
              {busy
                ? mode === "delete" ? "Deleting…" : "Saving…"
                : mode === "delete" ? "Delete workspace" : mode === "new" ? "Create workspace" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
