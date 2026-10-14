// Helpers shared by every Markdown page this site renders: the agent guide
// under /docs (app/lib/guide) and the hackathons page. The guide's own
// content lives in app/lib/guide/content.js.

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
 * The id a heading should carry.
 *
 * A heading written as a self-link names its own anchor, and that anchor is
 * what the other docs link to — `docs.md#status-and-logs` for a heading whose
 * visible text is "Checking deploy status & logs". Deriving the id from the
 * text instead would silently drop every one of those links at the top of the
 * page, so the explicit slug wins whenever there is one.
 */
export function headingId(raw: string): string {
  const explicit = /^\s*\[[^\]]+\]\(#([\w-]+)\)\s*$/.exec(raw);
  return explicit ? explicit[1] : slugify(headingText(raw));
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
    out.push({ id: headingId(m[2]), label, level: m[1].length === 2 ? 2 : 3 });
  }
  return out;
}
