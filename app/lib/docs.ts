// The public docs are authored in hostnsoft-api and served as raw markdown, so
// the site renders whatever is live there rather than keeping its own copy in
// sync by hand.
//
// This has to run on the server: the endpoint sends
// `access-control-allow-origin: https://embarko.ai`, so a fetch from the
// browser is blocked on every other origin (localhost included).

export const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_MD_URL ?? "https://ship.embarko.ai/api/public/docs.md";

// Re-fetch at most every 5 minutes. Docs change rarely, and a stale-by-minutes
// page beats putting an upstream request in front of every visitor.
const REVALIDATE_SECONDS = 300;

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
 * Fetch the published docs. Returns null when upstream is unreachable or
 * answers non-2xx, so the page can say so instead of erroring out.
 */
export async function fetchDocs(): Promise<string | null> {
  try {
    const res = await fetch(DOCS_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
