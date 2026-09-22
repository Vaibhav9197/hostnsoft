/**
 * Packs what the browser can offer into what the deploy endpoint accepts.
 *
 * The endpoint takes one thing: a gzipped tar, posted as multipart `source`
 * (see public/skills/embarko-deploy.sh, which is the reference implementation
 * every agent deploy already goes through). A person at a keyboard has a
 * folder, or a zip — so this converts both, and passes an existing tarball
 * through untouched.
 *
 * Everything here is native: CompressionStream and DecompressionStream do the
 * gzip and the inflate, and tar and zip are simple enough formats to read and
 * write directly. A packing library would be a dependency shipped to every
 * visitor for a screen most of them never open.
 *
 * Client-only — it touches File, Blob and the streams API.
 */

import { APP_NAME_MAX } from "./appName";

/** Never shipped. The same list the deploy script excludes, so an upload and an
 *  agent deploy of the same folder produce the same app. */
const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "venv",
  "__pycache__",
]);

/** Archive noise from the OS rather than the project. */
const EXCLUDED_FILES = new Set([".DS_Store", "Thumbs.db"]);

/** Past this, the upload is more likely a mistake — a folder someone picked
 *  with its build output still in it — than a real app. It also keeps the
 *  request inside what the Worker in front of the deploy service will take. */
export const MAX_PACKED_BYTES = 100 * 1024 * 1024;

export type PackEntry = { path: string; data: Uint8Array };

/** A Uint8Array is a valid BlobPart at runtime, but TypeScript only accepts one
 *  backed by a plain ArrayBuffer — and a `subarray` view is typed against the
 *  wider ArrayBufferLike. Copying to satisfy that would double the memory an
 *  upload holds, so the cast is kept here, once. */
const asPart = (bytes: Uint8Array): BlobPart => bytes as unknown as BlobPart;

/**
 * The excluded things a set of paths actually contains, by name.
 *
 * Purely for telling the person what was left out. node_modules in particular
 * is the bulk of most folders someone picks, and an upload that says "49 files"
 * for a project they know has thousands reads as broken unless something says
 * the dependencies were dropped on purpose — the platform installs them at
 * build time, so shipping them would only make the upload slower.
 */
export function excludedIn(paths: string[]): string[] {
  const found = new Set<string>();
  for (const path of paths) {
    for (const part of path.split("/")) {
      if (EXCLUDED_DIRS.has(part)) found.add(part);
    }
  }
  /* Stable order, most-worth-mentioning first, rather than whatever order the
     file system happened to hand over. */
  return [...EXCLUDED_DIRS].filter((d) => found.has(d));
}

/** Whether a path inside the archive is one we ship. */
function isExcluded(path: string): boolean {
  const parts = path.split("/");
  if (parts.some((p) => EXCLUDED_DIRS.has(p))) return true;
  /* __MACOSX is what macOS's own Compress puts beside the real entries; it is
     resource-fork metadata, never source. */
  if (parts[0] === "__MACOSX") return true;
  return EXCLUDED_FILES.has(parts[parts.length - 1]);
}

// --------------------------------------------------------------------- tar

const BLOCK = 512;

function writeOctal(buf: Uint8Array, offset: number, length: number, value: number) {
  /* ustar numeric fields are octal, NUL-terminated, right-aligned and zero
     padded — length-1 digits plus the terminator. */
  const text = value.toString(8).padStart(length - 1, "0");
  for (let i = 0; i < length - 1; i++) buf[offset + i] = text.charCodeAt(i);
  buf[offset + length - 1] = 0;
}

function writeAscii(buf: Uint8Array, offset: number, max: number, value: string) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > max) throw new Error(`Path too long for a tar header: ${value}`);
  buf.set(bytes, offset);
}

/**
 * One 512-byte ustar header.
 *
 * Paths over 100 bytes go in the `prefix` field, which is how ustar carries
 * them without the GNU long-name extension — a deep node_modules-free source
 * tree still hits this regularly (`src/components/console/…`).
 */
function tarHeader(path: string, size: number, mtime: number): Uint8Array {
  const head = new Uint8Array(BLOCK);

  let name = path;
  let prefix = "";
  if (new TextEncoder().encode(path).length > 100) {
    const cut = path.lastIndexOf("/", path.length - 100);
    if (cut <= 0) throw new Error(`Path too long to store in a tar archive: ${path}`);
    prefix = path.slice(0, cut);
    name = path.slice(cut + 1);
  }

  writeAscii(head, 0, 100, name);
  writeOctal(head, 100, 8, 0o644); // mode
  writeOctal(head, 108, 8, 0); // uid
  writeOctal(head, 116, 8, 0); // gid
  writeOctal(head, 124, 12, size);
  writeOctal(head, 136, 12, Math.floor(mtime / 1000));
  head[156] = "0".charCodeAt(0); // typeflag: regular file
  writeAscii(head, 257, 6, "ustar");
  head[263] = head[264] = "0".charCodeAt(0); // version "00"
  if (prefix) writeAscii(head, 345, 155, prefix);

  /* The checksum is computed with its own field read as spaces, then written
     back into it — six octal digits, NUL, space. */
  for (let i = 148; i < 156; i++) head[i] = 32;
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += head[i];
  const checksum = sum.toString(8).padStart(6, "0");
  for (let i = 0; i < 6; i++) head[148 + i] = checksum.charCodeAt(i);
  head[154] = 0;
  head[155] = 32;

  return head;
}

/** Pads a file's bytes out to the next 512-byte boundary. */
function padding(size: number): Uint8Array {
  const remainder = size % BLOCK;
  return new Uint8Array(remainder === 0 ? 0 : BLOCK - remainder);
}

/** Gzips a stream of parts with the platform's own compressor. */
async function gzip(parts: BlobPart[]): Promise<Blob> {
  const stream = new Blob(parts).stream().pipeThrough(new CompressionStream("gzip"));
  return await new Response(stream).blob();
}

/**
 * Entries in, one .tar.gz out.
 *
 * Paths are stored relative with a leading "./", which is what `tar -C dir .`
 * produces — the form the build side already reads from every agent deploy.
 */
export async function tarGz(entries: PackEntry[]): Promise<Blob> {
  const mtime = Date.now();
  const parts: BlobPart[] = [];

  for (const entry of entries) {
    parts.push(asPart(tarHeader(`./${entry.path}`, entry.data.length, mtime)));
    parts.push(asPart(entry.data));
    parts.push(asPart(padding(entry.data.length)));
  }
  /* Two zero blocks close the archive. Without them tar reads the stream as
     truncated and refuses it. */
  parts.push(asPart(new Uint8Array(BLOCK * 2)));

  return gzip(parts);
}

// --------------------------------------------------------------------- zip

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}
function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

/** Raw DEFLATE, or a stored entry copied straight out. */
async function inflate(data: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return data;
  if (method !== 8) throw new Error(`Unsupported zip compression method: ${method}`);
  const stream = new Blob([asPart(data)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Reads a zip into entries, via its central directory.
 *
 * The central directory is read rather than the local headers walked, because
 * a local header may declare sizes of zero and defer the real ones to a data
 * descriptor after the payload — the central directory always has them.
 */
export async function readZip(file: File): Promise<{ entries: PackEntry[]; skipped: string[] }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer);

  /* The end-of-central-directory record sits at the very end, behind a comment
     of up to 64KB, so it is found by scanning backwards for its signature. */
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("That doesn’t look like a zip file.");

  const count = u16(view, eocd + 10);
  let offset = u32(view, eocd + 16);

  const entries: PackEntry[] = [];
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    if (u32(view, offset) !== 0x02014b50) throw new Error("This zip file is damaged.");
    const method = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const nameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const localOffset = u32(view, offset + 42);
    const name = new TextDecoder().decode(buf.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    /* A trailing slash is a directory entry; tar gets its structure from the
       file paths themselves, so there is nothing to carry over. */
    names.push(name);
    if (name.endsWith("/") || isExcluded(name)) continue;

    /* The local header's own name and extra lengths are not required to match
       the central directory's, so the payload offset is read from it. */
    const localNameLength = u16(view, localOffset + 26);
    const localExtraLength = u16(view, localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    entries.push({
      path: name,
      data: await inflate(buf.subarray(start, start + compressedSize), method),
    });
  }
  return { entries, skipped: excludedIn(names) };
}

// -------------------------------------------------------------------- entry

/**
 * A folder or archive name, reshaped into something the endpoint can take.
 *
 * Best-effort only: it can't invent length a short name doesn't have, and it
 * doesn't know the reserved list. `appNameError` is what decides — this just
 * removes the characters that could never be valid.
 */
export function toAppName(raw: string): string {
  return raw
    .replace(/\.(tar\.gz|tgz|zip)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, APP_NAME_MAX);
}

/**
 * Strips the single wrapping folder a zip or a folder pick usually has.
 *
 * Both hand back paths led by the folder's own name ("my-app/package.json"),
 * but the build expects to find the manifest at the root. Only stripped when
 * every entry shares that one prefix — a zip of several projects side by side
 * keeps its shape, and fails honestly rather than deploying one of them.
 */
export function stripCommonRoot(entries: PackEntry[]): { entries: PackEntry[]; root: string | null } {
  if (entries.length === 0) return { entries, root: null };
  const first = entries[0].path.split("/")[0];
  if (!entries.every((e) => e.path.startsWith(`${first}/`))) return { entries, root: null };
  return {
    entries: entries.map((e) => ({ ...e, path: e.path.slice(first.length + 1) })),
    root: first,
  };
}

export type Packed = {
  blob: Blob;
  appName: string;
  fileCount: number;
  /** Excluded folders that were actually there, so the panel can say they were
   *  left out rather than leaving the file count looking wrong. */
  skipped: string[];
  /** The packed tree, kept so a problem below can be fixed without asking for
   *  the folder again. Null for a tarball, which is passed through unopened. */
  entries: PackEntry[] | null;
  /** Set when this would have failed on the server or in the build. See
   *  `inspect`. */
  problem: PackProblem | null;
};

/** True for something already in the shape the endpoint wants. */
export function isTarball(file: File): boolean {
  return /\.(tar\.gz|tgz)$/i.test(file.name);
}

/**
 * A dropped file — zip or tarball — ready to upload.
 *
 * A tarball is passed through without being opened: it is already the wire
 * format, and repacking it would only risk changing something.
 */
export async function packFile(file: File): Promise<Packed> {
  if (isTarball(file)) {
    return {
      blob: file,
      appName: toAppName(file.name),
      fileCount: 0,
      skipped: [],
      entries: null,
      problem: null,
    };
  }
  const zip = await readZip(file);
  const { entries, root } = stripCommonRoot(zip.entries);
  if (entries.length === 0) throw new Error("That zip file has nothing in it to deploy.");
  return {
    blob: await tarGz(entries),
    /* The folder inside the zip names the app before the zip itself does:
       "my-app.zip" and "archive (3).zip" are equally likely, and only one of
       them is a name anybody meant. */
    appName: toAppName(root ?? file.name),
    fileCount: entries.length,
    skipped: zip.skipped,
    entries,
    problem: inspect(entries),
  };
}

/**
 * A picked folder, ready to upload.
 *
 * `webkitRelativePath` is what carries the structure — a plain `File.name` is
 * just the leaf, so the tree has to be rebuilt from it.
 */
export async function packFolder(files: File[]): Promise<Packed> {
  const paths = files.map((f) => f.webkitRelativePath || f.name);
  const skipped = excludedIn(paths);
  const kept = files.filter((f) => !isExcluded(f.webkitRelativePath || f.name));
  if (kept.length === 0) throw new Error("That folder has nothing in it to deploy.");

  const entries: PackEntry[] = [];
  for (const file of kept) {
    entries.push({
      path: file.webkitRelativePath || file.name,
      data: new Uint8Array(await file.arrayBuffer()),
    });
  }
  const stripped = stripCommonRoot(entries);
  return {
    blob: await tarGz(stripped.entries),
    appName: toAppName(stripped.root ?? "app"),
    fileCount: stripped.entries.length,
    skipped,
    entries: stripped.entries,
    problem: inspect(stripped.entries),
  };
}

// ------------------------------------------------------------- preflight

/**
 * The manifests the platform's build looks for at the archive root, in the
 * same order the deploy script lists them.
 */
const MANIFESTS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
  "Cargo.toml",
];

/**
 * What's wrong with a packed upload, when it is wrong in a way that is
 * knowable here.
 *
 * Both shapes are the same mistake seen from two sides — "the app to deploy is
 * in a subdirectory" — and both fail on the server minutes into a build, with
 * an error that doesn't name the cause. `dir` is the folder to deploy instead,
 * which is what makes them fixable in one click rather than one explanation.
 */
export type PackProblem =
  /** Nothing buildable at the root, but a manifest one level down. */
  | { kind: "nested"; dir: string }
  /** A root package.json with no dependencies that hands its build to a
   *  subfolder — the ordinary frontend/backend repo, deployed from the top. */
  | { kind: "delegates"; dir: string };

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

function fileAt(entries: PackEntry[], path: string): PackEntry | undefined {
  return entries.find((e) => e.path === path);
}

/**
 * Mirrors detectDelegatingRoot in the server's detect-manifest-root.js (and
 * the same check in public/skills/embarko-deploy.sh) — keep the three in step.
 */
function delegatesTo(entries: PackEntry[]): string | null {
  const root = fileAt(entries, "package.json");
  if (!root) return null;

  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    workspaces?: string[] | { packages?: string[] };
  };
  try {
    pkg = JSON.parse(decode(root.data));
  } catch {
    return null;
  }

  /* A root that installs something of its own is a real app, whatever else its
     scripts do. */
  const deps =
    Object.keys(pkg.dependencies ?? {}).length +
    Object.keys(pkg.devDependencies ?? {}).length;
  if (deps > 0) return null;

  const patterns = [
    /--prefix[= ]+(\S+)/,
    /--cwd[= ]+(\S+)/,
    /--dir[= ]+(\S+)/,
    /(?:^|&&|;|\|)\s*cd\s+([^\s&;|]+)/,
  ];
  const candidates: string[] = [];
  for (const name of ["build", "start"]) {
    const text = pkg.scripts?.[name];
    if (typeof text !== "string") continue;
    for (const p of patterns) {
      const m = p.exec(text);
      if (m) candidates.push(m[1]);
    }
  }
  const ws = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : Array.isArray(pkg.workspaces?.packages)
      ? pkg.workspaces.packages
      : [];
  for (const w of ws) if (typeof w === "string") candidates.push(w);

  for (const raw of candidates) {
    const dir = raw.replace(/^\.\//, "").replace(/\/+$/, "");
    if (!dir || dir === "." || dir.includes("..") || dir.startsWith("/")) continue;
    if (fileAt(entries, `${dir}/package.json`)) return dir;
  }
  return null;
}

/** Nothing buildable at the root, but exactly the thing one level down. */
function nestedIn(entries: PackEntry[]): string | null {
  const rootHasApp =
    MANIFESTS.some((m) => fileAt(entries, m)) || !!fileAt(entries, "index.html");
  if (rootHasApp) return null;

  const wanted = new Set([...MANIFESTS, "index.html"]);
  for (const entry of entries) {
    const parts = entry.path.split("/");
    if (parts.length !== 2) continue;
    if (wanted.has(parts[1])) return parts[0];
  }
  return null;
}

/**
 * Everything worth refusing before an upload leaves the browser.
 *
 * The server rejects both of these too (`no_manifest_at_root` and
 * `app_nested_in_subdirectory`), and the build would fail on them anyway — but
 * only after the archive has been packed, sent and queued. Catching them here
 * means the panel can name the folder to deploy instead while the person is
 * still looking at the picker.
 */
export function inspect(entries: PackEntry[]): PackProblem | null {
  const nested = nestedIn(entries);
  if (nested) return { kind: "nested", dir: nested };
  const delegates = delegatesTo(entries);
  if (delegates) return { kind: "delegates", dir: delegates };
  return null;
}

/** Everything under `dir`, lifted to the archive root — the one-click fix for
 *  either problem above. */
export function reroot(entries: PackEntry[], dir: string): PackEntry[] {
  const prefix = `${dir}/`;
  return entries
    .filter((e) => e.path.startsWith(prefix))
    .map((e) => ({ ...e, path: e.path.slice(prefix.length) }));
}

/**
 * Re-packs an upload from the folder its problem named — the "deploy that
 * instead" path. The name follows the folder, because that is now the app.
 */
export async function packSubdirectory(packed: Packed, dir: string): Promise<Packed> {
  if (!packed.entries) throw new Error("There is nothing to re-pack here.");
  const entries = reroot(packed.entries, dir);
  if (entries.length === 0) throw new Error(`There is nothing inside ${dir}/ to deploy.`);
  return {
    blob: await tarGz(entries),
    appName: toAppName(dir),
    fileCount: entries.length,
    skipped: packed.skipped,
    entries,
    problem: inspect(entries),
  };
}
