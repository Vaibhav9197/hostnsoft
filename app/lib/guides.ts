// The blog is authored as markdown in this repo, under content/guides/, one
// file per post, the same way the docs are (see app/lib/docs.ts): imported as
// raw strings because production is a Cloudflare Worker with no filesystem at
// request time.
//
// Each post opens with a frontmatter block (the shape the SEO writer agent
// emits). To publish a post: add the file, import it below, add it to
// SOURCES. Nothing else needs touching; the index, sitemap and routes follow.

import deployWithoutGithubMd from "../../content/guides/deploy-app-without-github.md";
import hostClaudeWebsiteMd from "../../content/guides/host-website-built-with-claude.md";
import deployAiAppMd from "../../content/guides/how-to-deploy-ai-app.md";
import deployFromCursorMd from "../../content/guides/deploy-from-cursor.md";
import studentsMd from "../../content/guides/free-hosting-for-students.md";
import replitMd from "../../content/guides/deploy-replit-app-free.md";
import antigravityMd from "../../content/guides/deploy-antigravity-website.md";
import portfolioMd from "../../content/guides/host-portfolio-website-free.md";
import { headingId } from "./docs";

export interface BlogPost {
  slug: string;
  /** Page <title> and the post's h1 label on cards. */
  title: string;
  description: string;
  keywords: string[];
  category: string;
  /** Path under public/, drawn by scripts/guide-covers.mjs. Also the share image. */
  cover?: string;
  coverAlt: string;
  readMinutes: number;
  datePublished: string;
  dateModified: string;
  author: string;
  /** The article body, without the frontmatter. */
  body: string;
}

/** Every post we have a file for. Order does not matter; the list is sorted by date. */
const SOURCES: string[] = [deployWithoutGithubMd, hostClaudeWebsiteMd, deployAiAppMd, deployFromCursorMd, studentsMd, replitMd, antigravityMd, portfolioMd];

/**
 * Reads the `key: value` lines of a frontmatter block. Values are JSON
 * (`"text"`, `["a", "b"]`) or a bare number; nested keys are not supported
 * because posts do not need them.
 */
function parseFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { data: {}, body: source };

  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    try {
      data[kv[1]] = JSON.parse(kv[2]);
    } catch {
      data[kv[1]] = kv[2];
    }
  }
  return { data, body: match[2].trim() + "\n" };
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

function toPost(source: string): BlogPost | null {
  /* A file saved on Windows (or by a checkout with autocrlf) has \r\n endings,
     and every line-based parser below would then miss its headings. */
  const { data, body } = parseFrontmatter(source.replace(/\r\n?/g, "\n"));
  const slug = str(data.slug);
  /* A draft is a file the writer agent produced that a person has not signed
     off yet. It stays out of the build output entirely. */
  if (!slug || data.status !== "published") return null;

  return {
    slug,
    title: str(data.title),
    description: str(data.meta_description),
    keywords: Array.isArray(data.secondary_keywords)
      ? [str(data.primary_keyword), ...(data.secondary_keywords as string[])].filter(Boolean)
      : [str(data.primary_keyword)].filter(Boolean),
    category: str(data.category, "Guide"),
    cover: str(data.cover) || undefined,
    coverAlt: str(data.cover_alt),
    readMinutes: typeof data.read_minutes === "number" ? data.read_minutes : 5,
    datePublished: str(data.datePublished),
    dateModified: str(data.dateModified, str(data.datePublished)),
    author: str(data.author, "The Embarko team"),
    body,
  };
}

/** Published posts, newest first. */
export const POSTS: BlogPost[] = SOURCES.map(toPost)
  .filter((p): p is BlogPost => p !== null)
  .sort((a, b) => b.datePublished.localeCompare(a.datePublished));

export function postBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** "7 October 2026" from an ISO date, independent of the server's locale. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

export interface FaqItem {
  /** The question's anchor, from its self-link heading, so #faq-env still opens it. */
  id: string;
  question: string;
  /** The answer as markdown, rendered inside the open accordion. */
  answer: string;
}

export interface PostParts {
  /** The post's `#` heading, shown in the page header rather than the body. */
  heading: string | null;
  /** Everything before the first `##`, minus the heading: the answer-first block. */
  intro: string;
  /** The `## Key takeaways` section, heading included, shown first in its own box. */
  takeaways: string | null;
  /** From the first `##` up to the FAQ heading (or the end), minus the takeaways. */
  main: string;
  /** The FAQ heading line itself, kept so its anchor stays in the TOC. */
  faqHeading: string | null;
  faq: FaqItem[];
  /** Whatever follows the FAQ (the closing call to action). */
  outro: string;
}

/**
 * Cuts a post into the pieces the page lays out differently: the intro sits
 * above the jump links, and the FAQ renders as accordions instead of open
 * prose. Headings inside fenced code are ignored.
 */
export function splitPost(body: string): PostParts {
  const parts = splitBody(body);
  const m = /^## \[?Key takeaways\b[^\n]*\n[\s\S]*?(?=^## |(?![\s\S]))/m.exec(parts.main);
  if (!m) return { ...parts, takeaways: null };
  return { ...parts, takeaways: m[0].trim(), main: (parts.main.slice(0, m.index) + parts.main.slice(m.index + m[0].length)).trim() };
}

function splitBody(body: string): Omit<PostParts, "takeaways"> {
  const lines = body.split("\n");
  let inFence = false;
  let firstH2 = -1;
  let faqStart = -1;
  let faqEnd = lines.length;

  lines.forEach((line, i) => {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    if (inFence || !/^##\s/.test(line)) return;
    if (firstH2 === -1) firstH2 = i;
    if (faqStart === -1 && /^##\s+\[?FAQ\b/i.test(line)) faqStart = i;
    else if (faqStart !== -1 && i > faqStart && faqEnd === lines.length) faqEnd = i;
  });

  const join = (from: number, to: number) => lines.slice(from, to).join("\n").trim();
  /* The h1 moves into the page header; the intro keeps the rest. */
  const h1 = lines.findIndex((l, i) => (firstH2 === -1 || i < firstH2) && /^#\s+/.test(l));
  const heading = h1 === -1 ? null : lines[h1].replace(/^#\s+/, "").trim();
  const introOf = (end: number) =>
    lines
      .slice(0, end)
      .filter((_, i) => i !== h1)
      .join("\n")
      .trim();
  if (firstH2 === -1) return { heading, intro: introOf(lines.length), main: "", faqHeading: null, faq: [], outro: "" };
  if (faqStart === -1) {
    return { heading, intro: introOf(firstH2), main: join(firstH2, lines.length), faqHeading: null, faq: [], outro: "" };
  }

  const faq: FaqItem[] = [];
  let current: { raw: string; answer: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const explicit = /^\s*\[([^\]]+)\]\(#([\w-]+)\)\s*$/.exec(current.raw);
    faq.push({
      id: explicit ? explicit[2] : headingId(current.raw),
      question: explicit ? explicit[1] : current.raw.trim(),
      answer: current.answer.join("\n").trim(),
    });
  };
  for (const line of lines.slice(faqStart + 1, faqEnd)) {
    const q = /^###\s+(.*)$/.exec(line);
    if (q) {
      flush();
      current = { raw: q[1], answer: [] };
    } else if (current) {
      current.answer.push(line);
    }
  }
  flush();

  return {
    heading,
    intro: introOf(firstH2),
    main: join(firstH2, faqStart),
    faqHeading: lines[faqStart],
    faq,
    outro: join(faqEnd, lines.length),
  };
}

/**
 * The question and answer pairs under the post's `## FAQ` heading, for the
 * FAQPage schema. Every `###` under it is a question; the text up to the next
 * heading is the answer, with markdown links and emphasis reduced to text.
 */
export function extractFaq(body: string): { question: string; answer: string }[] {
  const faqStart = body.search(/^##\s+\[?FAQ\b/m);
  if (faqStart === -1) return [];

  const lines = body.slice(faqStart).split("\n").slice(1);
  const out: { question: string; answer: string }[] = [];
  let current: { question: string; answer: string[] } | null = null;
  const flush = () => {
    if (current && current.answer.length) {
      out.push({ question: current.question, answer: current.answer.join(" ").trim() });
    }
  };

  for (const line of lines) {
    if (/^##\s/.test(line)) break;
    const q = /^###\s+(.*)$/.exec(line);
    if (q) {
      flush();
      current = { question: q[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim(), answer: [] };
    } else if (current && line.trim()) {
      current.answer.push(
        line.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "").trim(),
      );
    }
  }
  flush();
  return out;
}

/* ---------- llms.txt: the guides in a form AI agents read directly ---------- */

const ORIGIN = "https://embarko.ai";

/**
 * The guide's markdown for an agent reading it outside the site: site-relative
 * links become absolute, in-page anchors point at the live page, and the
 * headings lose their self-link brackets so they read as plain titles.
 */
function forAgents(body: string, pageUrl: string): string {
  return body
    .replace(/^(#{1,6})[ \t]+\[([^\]]+)\]\(#[\w-]+\)[ \t]*$/gm, "$1 $2")
    .replace(/\]\(\/(?!\/)/g, `](${ORIGIN}/`)
    .replace(/\]\(#([\w-]+)\)/g, `](${pageUrl}#$1)`)
    .trim();
}

/** /guides/<slug>/llms.txt: one guide, whole, with where it lives and when it changed. */
export function guideLlmsText(post: BlogPost): string {
  const url = `${ORIGIN}/guides/${post.slug}`;
  return [
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    `- Page: ${url}`,
    `- Updated: ${post.dateModified}`,
    `- Author: ${post.author}`,
    `- All guides: ${ORIGIN}/guides/llms.txt`,
    `- Embarko for agents: ${ORIGIN}/llms.txt`,
    "",
    "---",
    "",
    forAgents(post.body, url),
    "",
  ].join("\n");
}

/** /guides/llms.txt: every published guide, newest first, each with its own llms.txt. */
export function guidesIndexLlmsText(): string {
  return [
    "# Embarko Guides",
    "",
    "> Step-by-step guides for putting an AI-built app online on Embarko, and for fixing it when a deploy breaks.",
    "",
    `Every guide is also a page at ${ORIGIN}/guides/<slug>. Each link below is the guide as plain markdown.`,
    "For the deploy API itself, start at " + `${ORIGIN}/llms.txt.`,
    "",
    "## Guides",
    "",
    ...POSTS.map((p) => `- [${p.title}](${ORIGIN}/guides/${p.slug}/llms.txt): ${p.description}`),
    "",
  ].join("\n");
}

/** Headers for a plain-text agent file: UTF-8 (the guides use arrows and dashes), cacheable. */
export const LLMS_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
} as const;
