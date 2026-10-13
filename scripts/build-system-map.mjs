// Scans the code and writes the facts layer of the Live PRD
// (app/lib/system/facts.generated.json): screens, endpoints, modules, tables,
// outside services and the commit they were read from — across all three
// repos that make up Embarko:
//
//   hostnsoft          this repo: the website, the panel, the admin pages
//   hostnsoft-api      accounts, apps, tokens, domains, billing, Showcase (@api)
//   hostnsoft-deploy   builds and runs the apps (@deploy)
//
// The two sibling repos are read from ../hostnsoft-api and ../hostnsoft-deploy
// (override with HOSTNSOFT_API_DIR / HOSTNSOFT_DEPLOY_DIR). They are only ever
// read. Their part of the scan is also saved to the committed
// app/lib/system/facts.repos.json, so a checkout without them — or the
// production build — still has the whole picture.
//
// A regex scan, not a compiler. It must never break `dev` or `build`, so any
// failure keeps the previous file and exits 0. `--check` exits 1 when the file
// on disk no longer matches the code.
//
// The /admin/system page and scripts/build-prd.mjs both read what this writes,
// through app/lib/system/map.ts. See app/admin/system/README.md.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FACTS_FILE = "app/lib/system/facts.generated.json";
export const REPOS_FILE = "app/lib/system/facts.repos.json";

const SOURCE_EXT = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".open-next", ".wrangler", ".git", "dist", "build"]);
/* Sibling repos keep prose and schema here, not code. */
const SIBLING_SKIP = new Set(["docs", "prisma", "static-server"]);

/* The repos, in display order. `callers` marks a file in another repo as one
   that talks to this repo over HTTP, so its path literals are matched against
   this repo's routes. */
export const REPOS = [
  {
    id: "web",
    alias: null,
    name: "hostnsoft",
    plain: "Website, panel and admin pages",
    dir: ROOT,
    src: ["app"],
    rootFiles: ["middleware.ts", "worker.ts", "next.config.mjs"],
    store: { id: "store", name: "Site database", engine: "Cloudflare D1", binding: "DB / DB_ADMIN", rows: true },
    callers: [],
  },
  {
    id: "api",
    alias: "@api",
    name: "hostnsoft-api",
    plain: "Accounts, apps, tokens, domains, billing and Showcase",
    dir: path.resolve(ROOT, process.env.HOSTNSOFT_API_DIR ?? "../hostnsoft-api"),
    src: ["src", "scripts"],
    rootFiles: [],
    store: { id: "api", name: "API database", engine: "SQLite via Prisma", binding: "DATABASE_URL", rows: false },
    callers: [/HOSTNSOFT_API_URL/, /\bAPI_BASE\b/, /\bhns\s*(<[^>]*>)?\s*\(/, /\bupstream\(/, /\bforwardToApi\b/],
  },
  {
    id: "deploy",
    alias: "@deploy",
    name: "hostnsoft-deploy",
    plain: "Builds the apps and keeps them running",
    dir: path.resolve(ROOT, process.env.HOSTNSOFT_DEPLOY_DIR ?? "../hostnsoft-deploy"),
    src: ["."],
    rootFiles: [],
    store: { id: "deploy", name: "Traffic database", engine: "SQLite on the deploy server", binding: "ANALYTICS_DB_PATH", rows: false },
    callers: [/HOSTNSOFT_DEPLOY_URL/, /\bDEPLOY_BASE\b/, /internalDeployClient/],
  },
];

/* Outside services, matched on hosts, env names and SDKs. Order is display order. */
const SERVICES = [
  { id: "ext:msg91", name: "MSG91", type: "sign-in and email", patterns: [/msg91\.com/i, /NEXT_PUBLIC_MSG91/, /\bMSG91_[A-Z_]+/, /\bMSG91_BASE\b/] },
  { id: "ext:nomad", name: "Nomad", type: "runs app containers", patterns: [/NOMAD_ADDR/, /NOMAD_TOKEN/] },
  { id: "ext:traefik", name: "Traefik", type: "routes traffic to apps", patterns: [/TRAEFIK_[A-Z_]+/, /traefik-router-file/] },
  { id: "ext:registry", name: "Image registry", type: "stores app images", patterns: [/REGISTRY_ADDR/] },
  { id: "ext:railpack", name: "Railpack", type: "builds app images", patterns: [/\brailpack\b/] },
  { id: "ext:docker", name: "Docker", type: "container engine", patterns: [/DOCKER_SOCKET_PATH/, /\bdocker (build|push|pull|image|rmi|ps|stats)\b/] },
  { id: "ext:lago", name: "Lago", type: "billing", patterns: [/\bLAGO_[A-Z_]+/, /getlago\.com/] },
  { id: "ext:stripe", name: "Stripe", type: "payments", patterns: [/\bSTRIPE_[A-Z_]+/, /api\.stripe\.com/] },
  { id: "ext:redis", name: "Redis", type: "rate limits and cache", patterns: [/\bREDIS_URL\b/, /from ["']redis["']/, /rate-limit-redis/] },
  { id: "ext:viasocket", name: "viaSocket webhook", type: "automation", patterns: [/flow\.sokt\.io/, /EARLY_ACCESS_WEBHOOK_URL/] },
  { id: "ext:gtm", name: "Google Tag Manager", type: "analytics", patterns: [/googletagmanager\.com/, /NEXT_PUBLIC_GTM_ID/] },
  { id: "ext:youtube", name: "YouTube", type: "video embeds", patterns: [/youtube\.com\/embed/, /youtube-nocookie\.com/, /youtu\.be/] },
  { id: "ext:social", name: "Social share links", type: "sharing", patterns: [/wa\.me\//, /x\.com\/intent/, /twitter\.com\/intent/, /linkedin\.com\/(sharing|share)/] },
];

const PRISMA_SCALARS = new Set(["String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", "Json", "Bytes"]);
const READ_OPS = /^(find\w*|count|aggregate|groupBy)$/;
const WRITE_OPS = /^(create\w*|update\w*|upsert|delete\w*)$/;

// --- helpers -----------------------------------------------------------------

function walk(dir, out = [], skip = new Set()) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith(".") || (e.isDirectory() && skip.has(e.name))) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out, skip);
    else if (SOURCE_EXT.includes(path.extname(e.name)) && !e.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

const noExt = (p) => p.replace(/\.(tsx?|mjs|cjs|js)$/, "");
const posix = (p) => p.split(path.sep).join("/");

/* Comments hold a lot of prose that looks like code ("reads FROM hero_events"),
   so they are stripped before anything is matched. A small scanner rather than
   a regex: a "/api/hns/*" inside a line comment must not open a block comment,
   and a "//" inside a string must not end the line. Strings stay. */
function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") i++;
    } else if (c === "/" && d === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      out += " ";
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && src[j] !== c) {
        if (src[j] === "\\") j++;
        else if (c !== "`" && src[j] === "\n") break;
        j++;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/* First sentence of the file's leading doc comment, for module summaries. */
function summaryOf(src) {
  const head = src.replace(/^#![^\n]*\n/, "").replace(/^\s*(["']use (client|server|strict)["'];?\s*)/, "");
  let text = "";
  const block = head.match(/^\s*\/\*\*?([\s\S]*?)\*\//);
  if (block) text = block[1].replace(/^\s*\*\s?/gm, " ");
  else {
    const lines = [];
    for (const line of head.split("\n")) {
      const m = line.match(/^\s*\/\/\s?(.*)$/);
      if (!m) break;
      lines.push(m[1]);
    }
    text = lines.join(" ");
  }
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const sentence = text.match(/^(.+?[.!?])(\s|$)/);
  return (sentence ? sentence[1] : text).slice(0, 220);
}

/* A route pattern with [slug] / [...path] / :param segments as a regex over URLs. */
/* Express routes written as templates (`/public/${slug}`) read as :params. */
const cleanRoute = (r) => r.replace(/\$\{(\w+)\}/g, ":$1");

function routeRegex(route) {
  const body = cleanRoute(route)
    .split("/")
    .map((s) => {
      if (/^\[\.\.\..+\]$/.test(s)) return "(?:.+)";
      if (/^\[.+\]$/.test(s) || /^:\w+\??$/.test(s)) return "[^/]+";
      if (s === "*") return ".*";
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${body}/?$`);
}

function nextRoute(file) {
  const dir = path.posix.dirname(file).replace(/^app\/?/, "");
  return "/" + dir.split("/").filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
}

/** Path literals in code, with template holes as one segment each. */
function pathLiterals(code) {
  const out = new Set();
  /* A literal path, or one written after a base URL: `${API_BASE}/apps/${x}`. */
  for (const m of code.matchAll(/(?:["'`]|\$\{[\w.]*(?:BASE|URL|ORIGIN|Base|Url|base|url)[\w.]*\})(\/[A-Za-z][^"'`?\s#]*)/g)) {
    const p = m[1].replace(/\$\{[^}]*\}/g, "x").replace(/\/$/, "");
    if (p.split("/").length >= 2) out.add(p);
  }
  return [...out];
}

function servicesIn(code) {
  return SERVICES.filter((s) => s.patterns.some((p) => p.test(code))).map((s) => s.id);
}

/* Express route definitions in one file, with any sub-router's mount
   prefix applied (`appScoped.get("/env-vars")` under
   `agentAppsRouter.use("/apps/:appName", appScoped)` is /apps/:appName/env-vars). */
function expressRoutes(code) {
  const vars = new Set(["app", "router"]);
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:express\.)?Router\(/g)) vars.add(m[1]);
  for (const m of code.matchAll(/\b(\w+Router)\b/g)) vars.add(m[1]);
  const prefix = new Map();
  for (const m of code.matchAll(/\b(\w+)\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*(?:[\w.]+\s*,\s*)*(\w+)\s*\)/g)) {
    if (vars.has(m[3])) prefix.set(m[3], m[2].replace(/\/$/, ""));
  }
  const out = [];
  for (const m of code.matchAll(/\b(\w+)\.(get|post|put|patch|delete|all)\(\s*["'`]([^"'`]+)["'`]/g)) {
    if (!vars.has(m[1])) continue;
    const base = prefix.get(m[1]) ?? "";
    const route = cleanRoute(base + (m[3] === "/" && base ? "" : m[3])) || "/";
    out.push({ method: m[2].toUpperCase(), route, index: m.index });
  }
  return out;
}

// --- tables ------------------------------------------------------------------

function noteBefore(raw, index) {
  const before = raw.slice(0, index).split("\n");
  before.pop();
  const lines = [];
  while (before.length) {
    const l = before.pop();
    if (/^\s*$/.test(l) && lines.length === 0) continue;
    const m = l.match(/^\s*(?:--|\/\/\/?)\s?(.*)$/);
    if (!m) break;
    lines.unshift(m[1]);
  }
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const sentence = text.match(/^(.+?[.!?])(\s|$)/);
  return (sentence ? sentence[1] : text).slice(0, 220);
}

/* CREATE TABLE statements, in .sql migrations or inside JS strings. */
function sqlTables(raw, source) {
  const out = [];
  for (const m of raw.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)\s*;/gi)) {
    const columns = [];
    const fks = [];
    for (const part of m[2].replace(/--[^\n]*/g, "").split(/,(?![^(]*\))/)) {
      const line = part.trim();
      const col = line.match(/^[`"]?(\w+)[`"]?\s+([A-Z]+)/i);
      if (col && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(col[1])) columns.push(col[1]);
      const fk = line.match(/FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\s*\((\w+)\)/i) ?? line.match(/^(\w+)\s+.*REFERENCES\s+(\w+)\s*\((\w+)\)/i);
      if (fk) fks.push({ from: `${m[1]}.${fk[1]}`, to: `${fk[2]}.${fk[3]}` });
    }
    out.push({ name: m[1], columns, fks, source, note: noteBefore(raw, m.index) });
  }
  for (const m of raw.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/gi)) out.push({ alter: m[1], column: m[2] });
  return out;
}

function prismaTables(schemaFile, rel) {
  let raw = "";
  try {
    raw = fs.readFileSync(schemaFile, "utf8");
  } catch {
    return { tables: [], fks: [] };
  }
  const models = new Set([...raw.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]));
  const tables = [];
  const fks = [];
  for (const m of raw.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const [, name, body] = m;
    const columns = [];
    for (const line of body.split("\n")) {
      const f = line.match(/^\s*(\w+)\s+(\w+)(\[\])?(\?)?/);
      if (!f || line.trim().startsWith("//") || line.trim().startsWith("@@")) continue;
      if (models.has(f[2]) || f[3]) {
        const rel = line.match(/@relation\([^)]*fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]/);
        if (rel) fks.push({ from: `${name}.${rel[1]}`, to: `${f[2]}.${rel[2]}` });
        continue;
      }
      if (PRISMA_SCALARS.has(f[2]) || /^[A-Z]/.test(f[2])) columns.push(f[1]);
    }
    tables.push({ name, columns, source: rel, note: noteBefore(raw, m.index) });
  }
  return { tables, fks };
}

// --- one repo ----------------------------------------------------------------

function scanRepo(repo, all) {
  const prefix = repo.alias ? `${repo.alias}/` : "";
  const absFiles = [
    ...repo.src.flatMap((s) => walk(path.join(repo.dir, s), [], repo.id === "web" ? new Set() : SIBLING_SKIP)),
    ...repo.rootFiles.map((f) => path.join(repo.dir, f)).filter((f) => fs.existsSync(f)),
  ];
  const files = [...new Set(absFiles.map((f) => posix(path.relative(repo.dir, f))))].sort();
  const src = new Map();
  for (const f of files) {
    const raw = fs.readFileSync(path.join(repo.dir, f), "utf8");
    src.set(f, { raw, code: stripComments(raw) });
  }

  // Tables.
  let tableDefs = [];
  let fkDefs = [];
  if (repo.id === "web") {
    const dir = path.join(repo.dir, "migrations");
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort() : []) {
      for (const t of sqlTables(fs.readFileSync(path.join(dir, f), "utf8"), `migrations/${f}`)) {
        if (t.alter) tableDefs.find((x) => x.name === t.alter)?.columns.push(t.column);
        else if (!tableDefs.some((x) => x.name === t.name)) {
          tableDefs.push(t);
          fkDefs.push(...t.fks);
        }
      }
    }
  } else if (repo.id === "api") {
    const p = prismaTables(path.join(repo.dir, "prisma/schema.prisma"), `${prefix}prisma/schema.prisma`);
    tableDefs = p.tables;
    fkDefs = p.fks;
  } else {
    for (const f of files) {
      for (const t of sqlTables(src.get(f).raw, `${prefix}${f}`)) {
        if (t.alter) tableDefs.find((x) => x.name === t.alter)?.columns.push(t.column);
        else if (!tableDefs.some((x) => x.name === t.name)) {
          tableDefs.push(t);
          fkDefs.push(...t.fks);
        }
      }
    }
  }
  const tableId = (n) => `table:${repo.store.id}:${n}`;
  const names = tableDefs.map((t) => t.name);

  const tableUse = (code) => {
    const reads = new Set();
    const writes = new Set();
    if (repo.id === "api") {
      const byLower = new Map(names.map((n) => [n.charAt(0).toLowerCase() + n.slice(1), n]));
      for (const m of code.matchAll(/\b(?:prisma|tx|db|client)\.(\w+)\.(\w+)\s*\(/g)) {
        const t = byLower.get(m[1]);
        if (!t) continue;
        if (READ_OPS.test(m[2])) reads.add(t);
        else if (WRITE_OPS.test(m[2])) writes.add(t);
      }
    } else if (names.length) {
      const alt = names.join("|");
      const w = new RegExp(`\\b(?:INSERT(?:\\s+OR\\s+\\w+)?\\s+INTO|REPLACE\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+[\`"]?(${alt})\\b`, "gi");
      const r = new RegExp(`\\b(DELETE\\s+)?(?:FROM|JOIN)\\s+[\`"]?(${alt})\\b`, "gi");
      for (const m of code.matchAll(w)) writes.add(m[1]);
      for (const m of code.matchAll(r)) if (!m[1]) reads.add(m[2]);
    }
    return { reads: [...reads].sort().map(tableId), writes: [...writes].sort().map(tableId) };
  };

  // Imports (ESM and require).
  const resolve = (from, spec) => {
    let base;
    if (spec.startsWith("@/") && repo.id === "web") base = path.join(repo.dir, spec.slice(2));
    else if (spec.startsWith(".")) base = path.resolve(path.dirname(path.join(repo.dir, from)), spec);
    else return null;
    const tries = [base, ...SOURCE_EXT.map((e) => base + e), ...SOURCE_EXT.map((e) => path.join(base, "index" + e))];
    for (const t of tries) {
      if (fs.existsSync(t) && fs.statSync(t).isFile()) {
        const r = posix(path.relative(repo.dir, t));
        return src.has(r) ? r : null;
      }
    }
    return null;
  };
  const imports = new Map();
  for (const f of files) {
    const out = new Set();
    const re = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|^\s*import\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/gm;
    for (const m of src.get(f).code.matchAll(re)) {
      const r = resolve(f, m[1] ?? m[2] ?? m[3] ?? m[4]);
      if (r && r !== f) out.add(r);
    }
    imports.set(f, [...out]);
  }

  /* Local name → the file it was imported from. */
  function importedNames(f, code) {
    const out = new Map();
    const add = (list, spec) => {
      const file = resolve(f, spec);
      if (!file) return;
      for (const part of list.split(",")) {
        const name = part.trim().split(/\s+as\s+|\s*:\s*/).pop()?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) out.set(name, file);
      }
    };
    for (const m of code.matchAll(/const\s*\{([^}]*)\}\s*=\s*require\(\s*["']([^"']+)["']\s*\)/g)) add(m[1], m[2]);
    for (const m of code.matchAll(/const\s+(\w+)\s*=\s*require\(\s*["']([^"']+)["']\s*\)/g)) add(m[1], m[2]);
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) add(m[1].replace(/\btype\s+/g, ""), m[2]);
    for (const m of code.matchAll(/import\s+(?:\*\s+as\s+)?(\w+)\s*(?:,\s*\{[^}]*\})?\s*from\s*["']([^"']+)["']/g)) add(m[1], m[2]);
    return out;
  }

  // Which files are pages, Next routes, or Express route definitions.
  const pageFiles = repo.id === "web" ? files.filter((f) => /^app\/(.*\/)?page\.tsx?$/.test(f)) : [];
  const routeFiles = repo.id === "web" ? files.filter((f) => /^app\/(.*\/)?route\.tsx?$/.test(f)) : [];
  const idOf = (f) => {
    if (pageFiles.includes(f)) return `page:${nextRoute(f)}`;
    if (routeFiles.includes(f)) return `api:${nextRoute(f)}`;
    return `lib:${prefix}${noExt(f)}`;
  };

  const endpointsRaw = [];
  if (repo.id === "web") {
    for (const f of routeFiles) {
      const code = src.get(f).code;
      const methods = new Set();
      for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)) methods.add(m[1]);
      for (const m of code.matchAll(/export\s*\{([^}]*)\}/g))
        for (const n of m[1].matchAll(/\bas\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)) methods.add(n[1]);
      endpointsRaw.push({ route: nextRoute(f), file: f, methods: [...methods] });
    }
  } else {
    /* An Express file defines many routes. Each route's handler is taken as
       the code up to the next route, plus whatever imported names it uses. */
    const byRoute = new Map();
    for (const f of files) {
      const code = src.get(f).code;
      const defs = expressRoutes(code);
      const names = importedNames(f, code);
      defs.forEach((d, k) => {
        const route = d.route;
        const body = code.slice(d.index, defs[k + 1]?.index ?? code.length);
        const e = byRoute.get(route) ?? { route, file: f, methods: new Set(), bodies: [], uses: new Set() };
        e.methods.add(d.method);
        e.bodies.push(body);
        for (const [name, file] of names) if (new RegExp(`\\b${name}\\b`).test(body)) e.uses.add(file);
        byRoute.set(route, e);
      });
    }
    for (const e of byRoute.values()) endpointsRaw.push({ ...e, methods: [...e.methods], uses: [...e.uses] });
  }
  const endpointFiles = new Set(endpointsRaw.map((e) => e.file));
  const endpointId = (route) => (repo.alias ? `api:${repo.alias}${route}` : `api:${route}`);

  const closure = (start) => {
    const seen = new Set();
    const stack = [start];
    while (stack.length) {
      const f = stack.pop();
      if (seen.has(f)) continue;
      seen.add(f);
      for (const i of imports.get(f) ?? []) if (!pageFiles.includes(i) && !routeFiles.includes(i)) stack.push(i);
    }
    return [...seen];
  };

  const ownMatchers = endpointsRaw.map((e) => ({ id: endpointId(e.route), re: routeRegex(e.route) }));

  /* Calls to other repos' endpoints, and to this repo's own Next routes. */
  const callsIn = (code) => {
    const out = new Set();
    const lits = pathLiterals(code);
    if (repo.id === "web") for (const p of lits) for (const m of ownMatchers) if (p.startsWith("/api/") && m.re.test(p)) out.add(m.id);
    for (const other of all) {
      if (other.id === repo.id || !other.matchers.length) continue;
      if (!other.callers.some((c) => c.test(code))) continue;
      for (const p of lits) for (const m of other.matchers) if (m.re.test(p)) out.add(m.id);
    }
    if (repo.id === "web" && /\bhns\s*(<[^>]*>)?\s*\(/.test(code)) out.add("api:/api/hns/[...path]");
    return out;
  };

  const endpoints = endpointsRaw.map((e) => {
    const reads = new Set();
    const writes = new Set();
    const services = new Set();
    const calls = new Set();
    /* An Express file defines many routes; only a Next route file is one
       endpoint, so only there is the whole import closure the endpoint's own. */
    const texts =
      repo.id === "web"
        ? closure(e.file).map((c) => src.get(c).code)
        : [...e.bodies, ...[...new Set(e.uses.flatMap(closure))].map((c) => src.get(c).code)];
    for (const text of texts) {
      const t = tableUse(text);
      t.reads.forEach((x) => reads.add(x));
      t.writes.forEach((x) => writes.add(x));
      servicesIn(text).forEach((x) => services.add(x));
      callsIn(text).forEach((x) => calls.add(x));
    }
    calls.delete(endpointId(e.route));
    return {
      id: endpointId(e.route),
      repo: repo.id,
      route: e.route,
      file: `${prefix}${e.file}`,
      methods: e.methods.sort(),
      inbound: /callback|webhook|cron|hook|\/internal\//i.test(e.route),
      imports: (repo.id === "web" ? imports.get(e.file) ?? [] : e.uses).map(idOf).sort(),
      calls: [...calls].sort(),
      tablesRead: [...reads].sort(),
      tablesWritten: [...writes].sort(),
      services: [...services].sort(),
    };
  });

  const screens = pageFiles.map((f) => {
    const dir = path.posix.dirname(f);
    const near = files.filter((x) => path.posix.dirname(x) === dir && !pageFiles.includes(x) && !routeFiles.includes(x));
    const scan = new Set([f, ...near]);
    for (const x of [f, ...near]) for (const i of imports.get(x)) if (!routeFiles.includes(i) && !pageFiles.includes(i)) scan.add(i);
    const calls = new Set();
    for (const x of scan) {
      callsIn(src.get(x).code).forEach((c) => calls.add(c));
      if (imports.get(x).includes("app/lib/hnsApi.ts")) calls.add("api:/api/hns/[...path]");
    }
    return {
      id: `page:${nextRoute(f)}`,
      repo: repo.id,
      route: nextRoute(f),
      file: f,
      files: [f, ...near].sort(),
      endpoints: [...calls].filter((c) => c.startsWith("api:/")).sort(),
      imports: [...new Set([f, ...near].flatMap((x) => imports.get(x)))].filter((i) => !near.includes(i)).map(idOf).sort(),
    };
  });

  const modules = files
    .filter((f) => !pageFiles.includes(f) && !routeFiles.includes(f))
    .map((f) => {
      const { raw, code } = src.get(f);
      const t = tableUse(code);
      const calls = callsIn(code);
      const defines = endpoints.filter((e) => e.file === `${prefix}${f}`).map((e) => e.id);
      return {
        id: `lib:${prefix}${noExt(f)}`,
        repo: repo.id,
        file: `${prefix}${f}`,
        summary: summaryOf(raw),
        imports: imports.get(f).map(idOf).sort(),
        endpoints: [...calls].filter((c) => !defines.includes(c)).sort(),
        defines,
        tablesRead: t.reads,
        tablesWritten: t.writes,
        services: servicesIn(code),
      };
    });
  void endpointFiles;

  const tables = tableDefs.map((t) => ({
    id: tableId(t.name),
    repo: repo.id,
    store: repo.store.id,
    name: t.name,
    migration: t.source,
    note: t.note ?? null,
    columns: t.columns,
  }));

  let commit = null;
  try {
    commit = execSync("git rev-parse --short HEAD", { cwd: repo.dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null;
  } catch {
    commit = null;
  }

  return {
    repo: { id: repo.id, alias: repo.alias, name: repo.name, plain: repo.plain, available: true, commit },
    store: { ...repo.store, repo: repo.id, tables: tables.map((t) => t.id) },
    screens,
    endpoints,
    modules,
    tables,
    foreignKeys: fkDefs.map((k) => ({ from: `${tableId(k.from.split(".")[0])}.${k.from.split(".")[1]}`, to: `${tableId(k.to.split(".")[0])}.${k.to.split(".")[1]}` })),
  };
}

/* Routes per repo, needed before any repo's calls can be matched. */
function routeMatchers(repo) {
  if (!fs.existsSync(repo.dir) || repo.id === "web") return [];
  const out = [];
  for (const f of repo.src.flatMap((s) => walk(path.join(repo.dir, s), [], SIBLING_SKIP))) {
    const code = stripComments(fs.readFileSync(f, "utf8"));
    for (const d of expressRoutes(code)) {
      if (d.route === "/" || d.route === "*") continue;
      out.push({ id: `api:${repo.alias}${d.route}`, re: routeRegex(d.route) });
    }
  }
  return out;
}

// --- build -------------------------------------------------------------------

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch {
    return null;
  }
}

/** Scans every repo it can reach; the rest come from the committed snapshot. */
export function buildFacts() {
  const all = REPOS.map((r) => ({ ...r, matchers: routeMatchers(r) }));
  const snapshot = readJson(REPOS_FILE) ?? {};
  const parts = [];
  for (const repo of all) {
    if (repo.id === "web" || fs.existsSync(path.join(repo.dir, repo.src[0]))) parts.push(scanRepo(repo, all));
    else if (snapshot[repo.id]) parts.push({ ...snapshot[repo.id], repo: { ...snapshot[repo.id].repo, available: false, commit: null } });
  }
  const own = parts.find((p) => p.repo.id === "web");
  return {
    repos: parts.map((p) => p.repo),
    /* All three stores belong to Embarko, so none is "external". Only the
       site database's rows are reachable from this app (rows: true). */
    stores: parts.map((p) => p.store),
    externalStores: [],
    screens: parts.flatMap((p) => p.screens),
    endpoints: parts.flatMap((p) => p.endpoints),
    modules: parts.flatMap((p) => p.modules),
    tables: parts.flatMap((p) => p.tables),
    foreignKeys: parts.flatMap((p) => p.foreignKeys),
    services: SERVICES.map(({ id, name, type }) => ({ id, name, type })),
    commit: own.repo.commit,
  };
}

/* The sibling repos' part of the facts, minus anything that changes per commit. */
function siblingSnapshot(facts) {
  const out = {};
  for (const r of facts.repos) {
    if (r.id === "web" || !r.available) continue;
    const mine = (x) => x.repo === r.id;
    out[r.id] = {
      repo: { ...r, commit: null, available: true },
      store: facts.stores.find((s) => s.repo === r.id),
      screens: facts.screens.filter(mine),
      endpoints: facts.endpoints.filter(mine),
      modules: facts.modules.filter(mine),
      tables: facts.tables.filter(mine),
      foreignKeys: facts.foreignKeys.filter((k) => facts.tables.some((t) => mine(t) && k.from.startsWith(`${t.id}.`))),
    };
  }
  return out;
}

/* Commits aside, so a new commit with no code change never fails the check. */
const comparable = (facts) => JSON.stringify({ ...facts, commit: null, repos: facts.repos.map((r) => ({ ...r, commit: null })) });

function writeIfChanged(rel, json) {
  const file = path.join(ROOT, rel);
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (old === json) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json);
  return true;
}

export function writeFacts(facts) {
  writeIfChanged(FACTS_FILE, JSON.stringify(facts, null, 2) + "\n");
  const snap = siblingSnapshot(facts);
  /* Only refresh the snapshot for repos actually scanned this time. */
  const merged = { ...(readJson(REPOS_FILE) ?? {}), ...snap };
  writeIfChanged(REPOS_FILE, JSON.stringify(merged, null, 1) + "\n");
}

function main() {
  const check = process.argv.includes("--check");
  let facts;
  try {
    facts = buildFacts();
  } catch (err) {
    console.error(`system map: scan failed, keeping the old file — ${err?.stack ?? err}`);
    process.exit(check ? 1 : 0);
  }
  if (check) {
    const old = readJson(FACTS_FILE);
    if (!old || comparable(old) !== comparable(facts)) {
      console.error(`system map: ${FACTS_FILE} is out of date — run npm run system:facts`);
      process.exit(1);
    }
    console.log("system map: up to date");
    return;
  }
  writeFacts(facts);
  const missing = facts.repos.filter((r) => !r.available).map((r) => r.name);
  console.log(
    `system map: ${facts.repos.length} repos · ${facts.screens.length} screens · ${facts.endpoints.length} endpoints · ${facts.modules.length} modules · ${facts.tables.length} tables` +
      (missing.length ? ` (from snapshot: ${missing.join(", ")})` : ""),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
