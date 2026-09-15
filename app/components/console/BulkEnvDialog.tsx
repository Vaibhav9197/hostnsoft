"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Alert } from "./kit";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { parseEnvFile } from "../../lib/envFile";

/**
 * Paste or upload a .env and save the whole block in one go.
 *
 * Everything is parsed as you type and shown back before anything is saved —
 * these are secrets, and a silent misparse is expensive.
 *
 * Two modes. "add" starts empty and only ever upserts, so nothing already
 * saved can be lost by pasting. "edit" starts from the variables that exist
 * and treats the box as the whole set: a line deleted there is a variable
 * deleted here. That difference is destructive enough to be worth stating in
 * the dialog rather than inferring from a prop name.
 */
export function BulkEnvDialog({
  open,
  onOpenChange,
  onSave,
  mode = "add",
  existing = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Upserts `vars`, deletes `removedKeys`. Throwing shows the message here. */
  onSave: (vars: { key: string; value: string }[], removedKeys: string[]) => Promise<void>;
  mode?: "add" | "edit";
  /** The variables as they stand. Seeds the box in edit mode, and is what
      the diff below compares against. Ignored in add mode. */
  existing?: { key: string; value: string }[];
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isEdit = mode === "edit";

  // Seed on open rather than on mount: the dialog stays mounted between
  // opens, and the variables may have changed since the last time.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setText(isEdit ? existing.map((v) => `${v.key}=${v.value}`).join("\n") : "");
    // existing is a fresh array each render; keying on the content keeps this
    // from re-seeding (and discarding edits) on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, existing.map((v) => `${v.key}=${v.value}`).join("\n")]);

  const parsed = parseEnvFile(text);

  // What saving would actually change. Only meaningful in edit mode, where
  // the box represents the complete set.
  const byKey = new Map(existing.map((v) => [v.key, v.value]));
  const nextKeys = new Set(parsed.vars.map((v) => v.key));
  const added = isEdit ? parsed.vars.filter((v) => !byKey.has(v.key)).map((v) => v.key) : [];
  const changed = isEdit
    ? parsed.vars.filter((v) => byKey.has(v.key) && byKey.get(v.key) !== v.value).map((v) => v.key)
    : [];
  // A line removed from the box means the variable goes. Never inferred in
  // add mode, where omission just means "not mentioned".
  const removedKeys = isEdit ? existing.filter((v) => !nextKeys.has(v.key)).map((v) => v.key) : [];
  const nothingToDo = isEdit && added.length === 0 && changed.length === 0 && removedKeys.length === 0;

  function reset() {
    setText("");
    setError(null);
  }

  // Append rather than replace — someone may have pasted a block already, and
  // throwing away what's in the box would be the surprising choice.
  async function addFile(file: File) {
    setError(null);
    try {
      const contents = await file.text();
      setText((t) => (t.trim() === "" ? contents : `${t.replace(/\s+$/, "")}\n${contents}`));
    } catch {
      setError("Couldn’t read that file.");
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file twice still fires a change.
    e.target.value = "";
    if (file) await addFile(file);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(parsed.vars.map(({ key, value }) => ({ key, value })), removedKeys);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save these variables.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit all variables" : "Add variables in bulk"}</DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                This is every variable, with its real value. Change what you need and save — a line you
                delete here <b className="text-foreground">deletes that variable</b>. Blank lines and{" "}
                <span className="font-mono">#</span> comments are ignored.
              </>
            ) : (
              <>
                Paste a block of <span className="font-mono">NAME=value</span> lines, or upload a{" "}
                <span className="font-mono">.env</span> file. Blank lines and <span className="font-mono">#</span>{" "}
                comments are ignored.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <textarea
          className="min-h-[180px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-[0.82rem] text-foreground outline-none placeholder:text-faint focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder={"DATABASE_URL=postgres://…\nSTRIPE_KEY=sk_live_…\n# comments are fine"}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          // The reliable way to get a dotfile in: no picker, no extension rules.
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            e.preventDefault();
            addFile(file);
          }}
          aria-label="Variables to add"
        />

        <div className="flex flex-wrap items-center gap-2.5">
          {/* No `accept` filter on purpose. It matches by extension, and the
              file is usually called exactly ".env" — which has none, so the
              picker greys it out; ".env.local" and ".env.production" miss too.
              Anything chosen here is parsed and shown back before it saves, so
              the filter bought nothing and blocked the common case. */}
          <input ref={fileInput} type="file" className="hidden" onChange={pickFile} />
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden="true" />
            Upload file
          </Button>
          {text.trim() !== "" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear
            </Button>
          )}
        </div>

        {/* Dotfiles are hidden in the system picker by default, which is the
            other half of why choosing a ".env" fails. Dragging it in avoids
            the picker altogether. */}
        <p className="text-[0.78rem] text-faint">
          A file named <span className="font-mono">.env</span> is hidden in the file picker — press{" "}
          <span className="font-mono">⌘⇧.</span> to show it, or just drag the file onto the box above.
        </p>

        {error && <Alert>{error}</Alert>}

        {/* Read the paste back before saving: the count, the names, and every
            line that couldn't be used. Values stay hidden — they're secrets,
            and the point here is confirming the key list. */}
        {text.trim() !== "" && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-elevated px-3.5 py-3">
            <p className="text-[0.85rem] text-muted-foreground">
              {isEdit
                ? nothingToDo
                  ? "No changes yet."
                  : [
                      changed.length > 0 && `${changed.length} changed`,
                      added.length > 0 && `${added.length} added`,
                      removedKeys.length > 0 && `${removedKeys.length} removed`,
                    ]
                      .filter(Boolean)
                      .join(", ")
                : parsed.vars.length === 0
                  ? "Nothing to add yet."
                  : `${parsed.vars.length} variable${parsed.vars.length === 1 ? "" : "s"} ready to save.`}
            </p>
            {/* Removals are the only part of saving that destroys something,
                so they're named individually rather than counted. */}
            {removedKeys.length > 0 && (
              <p className="text-[0.8rem] text-muted-foreground">
                <b className="text-destructive">Will be deleted:</b>{" "}
                <span className="font-mono text-foreground">{removedKeys.join(", ")}</span>
              </p>
            )}
            {!isEdit && parsed.vars.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {parsed.vars.map((v) => (
                  <span
                    key={v.key}
                    className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.72rem] text-foreground"
                  >
                    {v.key}
                  </span>
                ))}
              </p>
            )}
            {parsed.duplicates.length > 0 && (
              <p className="text-[0.8rem] text-muted-foreground">
                Listed twice, keeping the last value:{" "}
                <span className="font-mono text-foreground">{parsed.duplicates.join(", ")}</span>
              </p>
            )}
            {parsed.invalid.length > 0 && (
              <div className="text-[0.8rem] text-muted-foreground">
                <p className="text-foreground">
                  Skipping {parsed.invalid.length} line{parsed.invalid.length === 1 ? "" : "s"}:
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {parsed.invalid.slice(0, 5).map((l) => (
                    <li key={l.line}>
                      line {l.line} — {l.reason}
                    </li>
                  ))}
                  {parsed.invalid.length > 5 && <li>…and {parsed.invalid.length - 5} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={save}
            variant={removedKeys.length > 0 ? "destructive" : "default"}
            disabled={busy || (isEdit ? nothingToDo : parsed.vars.length === 0)}
          >
            {busy
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : parsed.vars.length === 0
                  ? "Save variables"
                  : `Save ${parsed.vars.length} variable${parsed.vars.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
