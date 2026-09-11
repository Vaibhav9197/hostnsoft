// The public docs are authored in hostnsoft-api and served as raw markdown, so
// the site renders whatever is live there rather than keeping its own copy in
// sync by hand.
//
// This has to run on the server: the endpoints send
// `access-control-allow-origin: https://embarko.ai`, so a fetch from the
// browser is blocked on every other origin (localhost included).

const DOCS_ORIGIN =
  process.env.NEXT_PUBLIC_DOCS_ORIGIN ?? "https://ship.embarko.ai/api/public";

// Re-fetch at most every 5 minutes. Docs change rarely, and a stale-by-minutes
// page beats putting an upstream request in front of every visitor.
const REVALIDATE_SECONDS = 300;

export interface DocMeta {
  /** The markdown file's basename upstream, e.g. "docs" for docs.md. */
  slug: string;
  /** Where it lives on this site. */
  path: string;
  /** Sidebar label and <title>. */
  title: string;
  description: string;
}

/**
 * Every doc we publish. The upstream file name is the slug, which is what lets
 * the cross-document links below be rewritten without a second mapping.
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
    path: "/troubleshoot",
    title: "Troubleshooting",
    description: "Real deploy failures, what causes them, and how to fix each one.",
  },
  {
    slug: "limitations-and-recommendations",
    path: "/limitations-and-recommendations",
    title: "Limitations & recommendations",
    description: "Confirmed platform constraints, each paired with what to do about it.",
  },
];

export function docBySlug(slug: string): DocMeta | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function docUrl(slug: string): string {
  return `${DOCS_ORIGIN}/${slug}.md`;
}

/**
 * The docs link to each other by absolute markdown URL — following one as-is
 * would hand the reader a raw .md file instead of the sibling page. Swap any
 * link to a doc we publish for its route here; leave every other link alone.
 */
export function localizeDocHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const m = new RegExp(`^${escapeRegExp(DOCS_ORIGIN)}/([a-z0-9-]+)\\.md(#.*)?$`, "i").exec(href);
  if (!m) return href;
  const target = docBySlug(m[1]);
  return target ? `${target.path}${m[2] ?? ""}` : href;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
 * Fetch one published doc. Returns null when upstream is unreachable or
 * answers non-2xx, so the page can say so instead of erroring out.
 */
export async function fetchDoc(slug: string): Promise<string | null> {
  try {
    const res = await fetch(docUrl(slug), {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
