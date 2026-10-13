// Lets plain Node import the app's TypeScript (app/lib/system/*) the way Next
// does: `@/` aliases, extensionless specifiers, and .ts/.tsx compiled on the
// fly with the esbuild the toolchain already ships. Registered by
// scripts/build-prd.mjs so the markdown and the page share one model.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = [".ts", ".tsx", ".mjs", ".js"];

function find(base) {
  for (const candidate of [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, "index" + e))]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith("@/")) base = path.join(ROOT, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const hit = find(base);
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (/\.tsx?$/.test(url)) {
    const file = fileURLToPath(url);
    const { code } = transformSync(fs.readFileSync(file, "utf8"), {
      loader: file.endsWith(".tsx") ? "tsx" : "ts",
      format: "esm",
      sourcefile: file,
      target: "node20",
    });
    return { format: "module", source: code, shortCircuit: true };
  }
  return next(url, context);
}
