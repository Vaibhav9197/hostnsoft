"use client";

import { useRef, useState } from "react";
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
 */
export function BulkEnvDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Upserts the pairs. Throwing surfaces the message inside the dialog. */
  onSave: (vars: { key: string; value: string }[]) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const parsed = parseEnvFile(text);

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
      await onSave(parsed.vars.map(({ key, value }) => ({ key, value })));
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
          <DialogTitle>Add variables in bulk</DialogTitle>
          <DialogDescription>
            Paste a block of <span className="font-mono">NAME=value</span> lines, or upload a{" "}
            <span className="font-mono">.env</span> file. Blank lines and <span className="font-mono">#</span> comments
            are ignored.
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
              {parsed.vars.length === 0
                ? "Nothing to add yet."
                : `${parsed.vars.length} variable${parsed.vars.length === 1 ? "" : "s"} ready to save.`}
            </p>
            {parsed.vars.length > 0 && (
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
          <Button onClick={save} disabled={busy || parsed.vars.length === 0}>
            {busy
              ? "Saving…"
              : parsed.vars.length === 0
                ? "Save variables"
                : `Save ${parsed.vars.length} variable${parsed.vars.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
