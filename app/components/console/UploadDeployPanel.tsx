"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, FolderUp, UploadCloud } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  MAX_PACKED_BYTES,
  isTarball,
  packFile,
  packFolder,
  packSubdirectory,
  toAppName,
  type Packed,
} from "@/app/lib/pack";
import { appNameError } from "@/app/lib/appName";

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
    if (phase.step !== "ready" || !companyId || nameError || phase.packed.problem) return;
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

  /* Re-packs from the folder the problem named, and takes its name — the
     subfolder is the app now, so "my-repo" is the wrong label for it. A
     redeploy keeps the name it is deploying over. */
  async function deployInstead(dir: string) {
    if (phase.step !== "ready") return;
    const current = phase.packed;
    setPhase({ step: "packing" });
    try {
      const packed = await packSubdirectory(current, dir);
      setPhase({ step: "ready", packed });
      setName(appSlug ?? packed.appName);
    } catch (e) {
      setPhase({
        step: "error",
        message: e instanceof Error ? e.message : "Couldn’t re-pack that folder.",
      });
    }
  }

  const problem = phase.step === "ready" ? phase.packed.problem : null;
  const busy = phase.step === "packing" || phase.step === "uploading";
  /* Shown under the field rather than waited for: a name the endpoint will
     refuse is knowable here, and finding out after an upload has been packed
     and sent is the slowest possible way to learn it. A redeploy's name came
     from the platform, so it is never the uploader's problem to fix. */
  const nameError = appSlug ? null : appNameError(name);

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
            {/* Named rather than silently dropped: a project with thousands of
                files packing to 49 looks broken unless something says the
                dependencies were left out on purpose. The platform installs
                them at build time, so sending them would only make the upload
                slower. */}
            {phase.packed.skipped.length > 0 &&
              ` · ${phase.packed.skipped.join(", ")} left out`}
            {isTarball(phase.packed.blob as File) && " · already a tarball, sent as-is"}
          </p>
          {/* The same two things the server refuses and the deploy script
              checks for locally, caught before anything is sent — both are
              "the app is in a subdirectory", and both otherwise fail minutes
              into a build with an error that names something else entirely.
              The fix is one button because the folder to deploy is already
              packed and named. */}
          {problem && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                The app to deploy is in a subdirectory,{" "}
                <span className="font-mono">{problem.dir}/</span>
              </AlertTitle>
              <AlertDescription>
                <p>
                  {problem.kind === "delegates"
                    ? "The folder you picked has no dependencies of its own and hands its build to that one, so the build would fail."
                    : "The folder you picked has nothing to build at its top level."}{" "}
                  One deploy is one app — if this also holds a separate backend, deploy
                  that on its own.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1"
                  onClick={() => deployInstead(problem.dir)}
                >
                  Deploy <span className="font-mono">{problem.dir}/</span> instead
                </Button>
              </AlertDescription>
            </Alert>
          )}

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
              {nameError ? (
                <span className="text-xs text-destructive">{nameError}</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  It becomes the address: <span className="font-mono">{name}.app.embarko.ai</span>
                </span>
              )}
            </label>
          )}
          <Button
            type="button"
            disabled={phase.step === "uploading" || !!nameError || !companyId || !!problem}
            onClick={deploy}
          >
            {phase.step === "uploading" ? "Deploying…" : "Deploy"}
          </Button>
        </div>
      )}
    </div>
  );
}
