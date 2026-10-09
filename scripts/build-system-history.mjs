// Reads git history into app/lib/system/history.generated.json, the version
// layer of the Live PRD: every non-merge commit that touched the product's
// code, the files it changed, the tables its migrations named, and when each
// file first appeared.
//
// Unlike the facts file this one is committed. Production builds from a
// bundle with no .git, so without git this exits 0 and keeps what is there.
// The file is rewritten only when its content changes (the timestamp aside),
// so a run never leaves a diff for nothing.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { REPOS } from "./build-system-map.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app/lib/system/history.generated.json");
const BODY_CAP = 1200;

/* What counts as product code in each repo. */
const PATHS = {
  web: ["app", "middleware.ts", "worker.ts", "next.config.mjs", "migrations"],
  api: ["src", "prisma/schema.prisma", "prisma/migrations", "scripts"],
  deploy: ["."],
};

let CWD = ROOT;
function git(args) {
  return execFileSync("git", args, { cwd: CWD, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString();
}

/* numstat writes a rename as "a/{old => new}/f" or "old => new". */
function renamed(p) {
  const brace = p.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
  if (brace) {
    const join = (mid) => (brace[1] + mid + brace[4]).replace(/\/{2,}/g, "/");
    return { from: join(brace[2]), to: join(brace[3]) };
  }
  const plain = p.match(/^(.*) => (.*)$/);
  return plain ? { from: plain[1], to: plain[2] } : { from: p, to: p };
}

function repoUrl() {
  try {
    const remote = git(["remote", "get-url", "origin"]).trim();
    const ssh = remote.match(/^git@([^:]+):(.+?)(\.git)?$/);
    if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
    return remote.replace(/\.git$/, "").replace(/^git\+/, "") || null;
  } catch {
    return null;
  }
}

/* Tables a migration names, from the file as it was at that commit. */
function migrationTables(sha, file) {
  let sql = "";
  try {
    sql = git(["show", `${sha}:${file}`]);
  } catch {
    return [];
  }
  sql = sql.replace(/--[^\n]*/g, "");
  const out = new Set();
  const res = [
    /CREATE TABLE(?: IF NOT EXISTS)?\s+[`"]?(\w+)/gi,
    /ALTER TABLE\s+[`"]?(\w+)/gi,
    /INSERT(?:\s+OR\s+\w+)?\s+INTO\s+[`"]?(\w+)/gi,
    /\bUPDATE\s+[`"]?(\w+)\s+SET/gi,
    /RENAME TABLE\s+[`"]?(\w+)[`"]?\s+TO\s+[`"]?(\w+)/gi,
    /ALTER TABLE\s+\w+\s+RENAME TO\s+[`"]?(\w+)/gi,
  ];
  for (const re of res) for (const m of sql.matchAll(re)) for (const g of m.slice(1)) if (g) out.add(g);
  return [...out].sort();
}

/* One repo's history. Paths in a sibling repo carry its alias ("@api/src/…"),
   the same form the facts use. */
function buildRepo(repo) {
  CWD = repo.dir;
  const pre = repo.alias ? `${repo.alias}/` : "";
  const paths = PATHS[repo.id];
  const log = git([
    "log",
    "--no-merges",
    "-M",
    "--numstat",
    "--format=%x1e%H%x1f%h%x1f%aI%x1f%an%x1f%s%x1f%b%x1f",
    "--",
    ...paths,
  ]);

  const commits = [];
  for (const chunk of log.split("\x1e")) {
    if (!chunk.trim()) continue;
    const parts = chunk.split("\x1f");
    const [sha, short, date, author, subject, body] = parts;
    const stat = parts.slice(6).join("\x1f");
    const files = [];
    for (const line of stat.split("\n")) {
      const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!m) continue;
      if (/(^|\/)(node_modules|docs)\//.test(m[3])) continue;
      files.push({
        path: pre + renamed(m[3]).to,
        add: m[1] === "-" ? 0 : Number(m[1]),
        del: m[2] === "-" ? 0 : Number(m[2]),
      });
    }
    /* Sign-off and co-author trailers carry email addresses and say nothing
       about the change, so they are dropped here rather than shipped. */
    let text = (body ?? "")
      .split("\n")
      .filter((l) => !/^\s*(co-authored-by|signed-off-by|reviewed-by|acked-by):/i.test(l))
      .join("\n")
      .trim();
    if (text.length > BODY_CAP) text = text.slice(0, BODY_CAP).trimEnd() + "…";
    const tables = [
      ...new Set(
        files
          .filter((f) => /(^|\/)migrations\/.+\.sql$/.test(f.path))
          .flatMap((f) => migrationTables(sha, f.path.slice(pre.length))),
      ),
    ].sort();
    commits.push({ repo: repo.id, sha, short, date, author, subject, body: text, files, tables });
  }

  /* When each file first appeared. Oldest first, so the first add wins; a
     rename carries the old path's date forward rather than counting as new. */
  const firstSeen = {};
  const names = git(["log", "--no-merges", "-M", "--reverse", "--name-status", "--format=%x1e%h%x1f%aI", "--", ...paths]);
  for (const chunk of names.split("\x1e")) {
    if (!chunk.trim()) continue;
    const [head, ...lines] = chunk.split("\n");
    const [short, date] = head.split("\x1f");
    for (const line of lines) {
      const cols = line.split("\t");
      const status = cols[0];
      if (status === "A" && !firstSeen[pre + cols[1]]) firstSeen[pre + cols[1]] = { short, date };
      else if (status?.startsWith("R") && cols[2] && !firstSeen[pre + cols[2]]) {
        firstSeen[pre + cols[2]] = firstSeen[pre + cols[1]] ?? { short, date };
      }
    }
  }

  return { url: repoUrl(), commits, firstSeen };
}

function main() {
  let old = null;
  try {
    old = JSON.parse(fs.readFileSync(OUT, "utf8"));
  } catch {
    old = null;
  }
  /* Repos without git here (a production bundle, a checkout without the
     siblings) keep what the committed file already says about them. */
  const repos = {};
  for (const repo of REPOS) {
    try {
      CWD = repo.dir;
      git(["rev-parse", "--git-dir"]);
      repos[repo.id] = buildRepo(repo);
    } catch {
      if (old?.repos?.[repo.id]) repos[repo.id] = old.repos[repo.id];
    }
  }
  const history = { repos };
  const { generatedAt: _, ...previous } = old ?? {};
  const same = !!old && JSON.stringify(previous) === JSON.stringify(history);
  if (!same) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), ...history }) + "\n");
  }
  const counts = Object.entries(repos).map(([id, r]) => `${id} ${r.commits.length}`).join(" · ");
  console.log(`system history: ${counts}${same ? " (unchanged)" : ""}`);
}

main();
