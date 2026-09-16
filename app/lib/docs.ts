// The public docs are authored as markdown in this repo, under content/docs/,
// one file per entry in DOCS below. They used to be fetched from
// hostnsoft-api at render time; they're now part of the build, so a docs
// change ships with a site deploy and a reader never waits on an upstream
// request.
//
// The markdown is imported as a raw string (see the webpack rule in
// next.config.mjs). It can't be read from disk instead: production is a
// Cloudflare Worker, which has no filesystem at request time.

import docsMd from "../../content/docs/docs.md";
import troubleshootMd from "../../content/docs/troubleshoot.md";
import limitationsMd from "../../content/docs/limitations-and-recommendations.md";
import hackathonsMd from "../../content/docs/hackathons.md";

export interface DocMeta {
  /** The file's basename under content/docs/, e.g. "docs" for docs.md. */
  slug: string;
  /** Where it lives on this site. */
  path: string;
  /** Sidebar label and <title>. */
  title: string;
  description: string;
}

/**
 * Every doc we publish. The file name is the slug, which is what lets the
 * cross-document links below be rewritten without a second mapping.
 */
export const DOCS: DocMeta[] = [
  {
    slug: "docs",
    path: "/docs",
    title: "Documentation",
    description: "How to deploy an app to Embarko and manage it once it's live.",
  },
  {
    slug: "troubleshoot",
    path: "/docs/troubleshoot",
    title: "Troubleshooting",
    description: "Real deploy failures, what causes them, and how to fix each one.",
  },
  {
    // The only entry whose route isn't its slug: the file name is worth being
    // explicit, a 30-character URL isn't.
    slug: "limitations-and-recommendations",
    path: "/docs/limitations",
    title: "Limitations & recommendations",
    description: "Confirmed platform constraints, each paired with what to do about it.",
  },
  {
    // Top-level on purpose. It reads as a landing page for event organisers,
    // not as reference material, and it gets shared on its own.
    slug: "hackathons",
    path: "/hackathons",
    title: "Hackathons",
    description: "Free Embarko Pro for every participant, and a Showcase page for your event.",
  },
];

export function docBySlug(slug: string): DocMeta | undefined {
  return DOCS.find((d) => d.slug === slug);
}

/** The markdown itself, keyed by slug. Every slug in DOCS must appear here. */
const MARKDOWN: Record<string, string> = {
  docs: docsMd,
  troubleshoot: troubleshootMd,
  "limitations-and-recommendations": limitationsMd,
  hackathons: hackathonsMd,
};

/**
 * The docs link to each other by markdown file name — `troubleshoot.md`, or
 * `docs.md#memory-allocation`. Following one as-is would 404, or hand the
 * reader a raw file. Swap any link to a doc we publish for its route here;
 * leave every other link alone.
 *
 * Absolute links to the old hostnsoft-api origin are still matched: they
 * appear in docs written before the markdown moved into this repo, and a
 * reader shouldn't be sent off-site to read a page that is right here.
 */
export function localizeDocHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const m = /^(?:https?:\/\/[^/]+(?:\/[^/]*)*\/)?([a-z0-9-]+)\.md(#.*)?$/i.exec(href);
  if (!m) return href;
  const target = docBySlug(m[1]);
  return target ? `${target.path}${m[2] ?? ""}` : href;
}

export interface TocEntry {
  id: string;
  label: string;
  level: 2 | 3;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Headings in the source are written as self-links — `## [Overview](#overview)`
// — so the label is the link text, not the whole markdown string.
function headingText(raw: string): string {
  return raw.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
}

/**
 * Pull the h2/h3 headings out for the sidebar. Fenced code blocks are skipped
 * so a `# comment` inside a bash sample never becomes a nav item.
 */
export function extractToc(markdown: string): TocEntry[] {
  const out: TocEntry[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (!m) continue;

    const label = headingText(m[2]);
    if (!label) continue;
    out.push({ id: slugify(label), label, level: m[1].length === 2 ? 2 : 3 });
  }
  return out;
}

/**
 * The markdown for one published doc, or undefined if the slug isn't one we
 * publish. Nothing can fail at runtime here — the content is in the bundle, so
 * a missing file is a build error rather than a broken page.
 */
export function docMarkdown(slug: string): string | undefined {
  return MARKDOWN[slug];
}
