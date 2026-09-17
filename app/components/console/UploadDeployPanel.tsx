"use client";

import { useCallback, useRef, useState } from "react";
import { FolderUp, UploadCloud } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MAX_PACKED_BYTES, isTarball, packFile, packFolder, toAppName, type Packed } from "@/app/lib/pack";

/**
 * Deploy by handing over the app itself, rather than asking an agent to.
 *
 * The person picks a folder or a zip; the browser packs it to the .tar.gz the
 * deploy endpoint takes (see app/lib/pack.ts) and posts it to /api/apps/upload,
 * which signs it with the session the page can't read.
 *
 * Packing happens on drop rather than on Deploy, so the name, the file count
 * and the size are all on screen before anything is sent — most mistakes here
 * are "I picked the wrong folder", and that is only visible once something
 * says which folder it was.
 */

type Phase =
  | { step: "empty" }
  | { step: "packing" }
  | { step: "ready"; packed: Packed }
  | { step: "uploading"; packed: Packed }
  | { step: "error"; message: string };

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function UploadDeployPanel({
  companyId,
  /** Fixed for a redeploy — the app being replaced, which must keep its name
   *  or the deploy stands up a second app on a second subdomain. */
  appSlug,
  onDeployed,
}: {
  companyId: string | null;
  appSlug?: string | null;
  onDeployed: (appName: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ step: "empty" });
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    async (pack: () => Promise<Packed>) => {
      setPhase({ step: "packing" });
      try {
        const packed = await pack();
        if (packed.blob.size > MAX_PACKED_BYTES) {
          throw new Error(
            `That comes to ${formatSize(packed.blob.size)} packed — 100 MB is the limit.`,
          );
        }
        setPhase({ step: "ready", packed });
        /* A redeploy's name is not the uploader's to change; a first deploy
           takes the folder's name as a starting point. */
        setName(appSlug ?? packed.appName);
      } catch (e) {
        setPhase({
          step: "error",
          message: e instanceof Error ? e.message : "Couldn’t read that file.",
        });
      }
    },
    [appSlug],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      /* A directory pick arrives as every file inside it, each carrying its
         own webkitRelativePath; a file pick is the one file. */
      const list = Array.from(files);
      const isFolder = list.some((f) => f.webkitRelativePath);
      accept(() => (isFolder ? packFolder(list) : packFile(list[0])));
    },
    [accept],
  );

  async function deploy() {
    if (phase.step !== "ready" || !companyId) return;
    const packed = phase.packed;
    setPhase({ step: "uploading", packed });

    const form = new FormData();
    form.append("source", packed.blob, `${name}.tar.gz`);
    form.append("appName", name);
    form.append("companyId", companyId);

    try {
      const res = await fetch("/api/apps/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        /* 409 is the one failure with an obvious next move, so it says what to
           do rather than repeating the endpoint's wording. */
        throw new Error(
          res.status === 409
            ? `The name “${name}” is taken. Try another one.`
            : data?.error ?? "The upload didn’t go through.",
        );
      }
      onDeployed(name);
    } catch (e) {
      setPhase({
        step: "error",
        message: e instanceof Error ? e.message : "The upload didn’t go through.",
      });
    }
  }

  const busy = phase.step === "packing" || phase.step === "uploading";

  return (
    <div className="flex flex-col gap-3">
      {/* Both pickers are the same native input, differing only in whether it
          takes a directory — Safari ignores webkitdirectory, so the file path
          stays available there rather than the panel having no way in. */}
      <input
        ref={fileInput}
        type="file"
        accept=".zip,.tar.gz,.tgz"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <input
        ref={folderInput}
        type="file"
        /* Not a documented React prop; it has to be set as an attribute. */
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center transition-colors ${
          dragging ? "border-foreground bg-elevated" : "border-input bg-elevated/50"
        }`}
      >
        <UploadCloud className="size-5 text-muted-foreground" aria-hidden="true" />
        {phase.step === "packing" ? (
          <p className="text-muted-foreground">Packing your app…</p>
        ) : (
          <>
            <p className="text-foreground">Drop your app here</p>
            <p className="text-xs text-muted-foreground">A folder, or a .zip</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button variant="outline" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
                Choose a file
              </Button>
              <Button variant="outline" type="button" disabled={busy} onClick={() => folderInput.current?.click()}>
                <FolderUp />
                Choose a folder
              </Button>
            </div>
          </>
        )}
      </div>

      {phase.step === "error" && (
        <p className="text-[0.82rem] text-destructive">{phase.message}</p>
      )}

      {(phase.step === "ready" || phase.step === "uploading") && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {formatSize(phase.packed.blob.size)} packed
            {phase.packed.fileCount > 0 && ` · ${phase.packed.fileCount} files`}
            {isTarball(phase.packed.blob as File) && " · already a tarball, sent as-is"}
          </p>
          {/* Fixed on a redeploy: changing it here wouldn't update this app,
              it would quietly create a different one. */}
          {appSlug ? (
            <p className="text-[0.9rem] text-muted-foreground">
              Deploying over <span className="font-mono text-foreground">{appSlug}</span>
            </p>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-[0.82rem] text-muted-foreground">Name it</span>
              <Input
                className="font-mono"
                value={name}
                onChange={(e) => setName(toAppName(e.target.value))}
                disabled={phase.step === "uploading"}
                aria-label="App name"
              />
              <span className="text-xs text-muted-foreground">
                It becomes the address: <span className="font-mono">{name || "your-app"}.app.embarko.ai</span>
              </span>
            </label>
          )}
          <Button type="button" disabled={phase.step === "uploading" || !name || !companyId} onClick={deploy}>
            {phase.step === "uploading" ? "Deploying…" : "Deploy"}
          </Button>
        </div>
      )}
    </div>
  );
}
