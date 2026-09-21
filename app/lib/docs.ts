// The public docs are authored as markdown in this repo, under content/docs/,
// one file per entry in DOCS below. They used to be fetched from
// hostnsoft-api at render time; they're now part of the build, so a docs
// change ships with a site deploy and a reader never waits on an upstream
// request.
//
// The markdown is imported as a raw string (see the webpack rule in
// next.config.mjs). It can't be read from disk instead: production is a
// Cloudflare Worker, which has no filesystem at request time.

import overviewMd from "../../content/docs/overview.md";
import capabilitiesMd from "../../content/docs/capabilities.md";
import quickstartMd from "../../content/docs/agent-quickstart.md";
import escalationMd from "../../content/docs/escalation.md";
import playbookMd from "../../content/docs/agent-playbook.md";
import apiMd from "../../content/docs/api.md";
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
  /** Search terms for the page <meta name="keywords">. */
  keywords: string[];
}

/**
 * Every doc we publish. The file name is the slug, which is what lets the
 * cross-document links below be rewritten without a second mapping.
 */
export const DOCS: DocMeta[] = [
  {
    // First on purpose: the conceptual layer. An agent handed only this page
    // should be able to say what Embarko is, what it does, what it does not
    // do yet, and whether a given app belongs here — without reading any API
    // reference. Everything else in DOCS assumes that context; this page
    // assumes nothing.
    slug: "overview",
    path: "/docs/overview",
    keywords: ["what is Embarko","cloud hosting for AI agents","hosting for vibe coded apps","deploy app built by AI"],
    title: "Overview",
    description: "What Embarko is, what it does, and which apps belong on it.",
  },
  {
    // The capability manifest. One entry per feature, each answering the
    // same four questions (what / when / how / limits), so an agent can
    // decide whether a thing is possible before writing code against it.
    // GET /capabilities is the machine-readable twin and wins on conflict.
    slug: "capabilities",
    path: "/docs/capabilities",
    keywords: ["Embarko capabilities","what can Embarko do","Embarko features list","Embarko limits"],
    title: "Capabilities",
    description: "Every Embarko capability: what it is, when to use it, how, and its limits.",
  },
  {
    // The autonomous-operation contract: per action, its auth, parameters,
    // response shape, states, errors, what is retryable and what repeating
    // it does. Separate from docs.md because the audience differs — docs.md
    // teaches the happy path, this is what an agent consults mid-run when
    // something returned a code it has to decide about.
    slug: "api",
    path: "/docs/api",
    keywords: ["Embarko API reference","deploy API contract","Embarko error codes","agent API integration"],
    title: "API contract",
    description: "Every Embarko action: auth, parameters, responses, states, errors and retry rules.",
  },
  {
    // Procedures rather than reference. Agents follow an ordered recipe far
    // more reliably than they assemble one from endpoint docs, so each entry
    // here runs start to finish, including the decision points (what to do
    // when a step fails) and when it is legitimate to interrupt the user.
    slug: "agent-playbook",
    path: "/docs/agent-playbook",
    keywords: ["Embarko agent playbook","how to deploy step by step","AI agent deploy procedure","fix failed deployment"],
    title: "Agent playbook",
    description: "Step-by-step procedures for deploying, updating, fixing, rolling back and configuring apps.",
  },
  {
    // The escalation boundary. The product promise is that the human never
    // has to operate a cloud, and that promise is kept or broken one
    // question at a time — so the list of what an agent must decide itself
    // is written down rather than left to judgement.
    slug: "escalation",
    path: "/docs/escalation",
    keywords: ["when to ask the user","AI agent escalation policy","autonomous deployment rules","agent human handoff"],
    title: "When to involve the human",
    description: "What an agent must decide itself, and the five cases where it should ask the user.",
  },
  {
    // The happy path alone, kept deliberately short. It is the page an
    // agent reaches first from llms.txt, and its job is to get an app live
    // without the agent reading anything else. Every other outcome is a
    // link out to the playbook.
    slug: "agent-quickstart",
    path: "/docs/agent-quickstart",
    keywords: ["deploy app quickly","Embarko quickstart","AI agent deploy steps","deploy without account"],
    title: "Agent quickstart",
    description: "The shortest path from an app on disk to a live URL, with no account or token.",
  },
  {
    slug: "docs",
    path: "/docs",
    keywords: ["Embarko docs","how to deploy an app with AI","deploy app from AI agent","Embarko deploy prompt"],
    title: "Documentation",
    description: "How to deploy an app to Embarko and manage it once it's live.",
  },
  {
    slug: "troubleshoot",
    path: "/docs/troubleshoot",
    keywords: ["Embarko deploy failed","fix deployment error","troubleshoot app deploy","build failed hosting"],
    title: "Troubleshooting",
    description: "Real deploy failures, what causes them, and how to fix each one.",
  },
  {
    // The only entry whose route isn't its slug: the file name is worth being
    // explicit, a 30-character URL isn't.
    slug: "limitations-and-recommendations",
    path: "/docs/limitations",
    keywords: ["Embarko limitations","hosting limits","what Embarko supports","app hosting constraints"],
    title: "Limitations & recommendations",
    description: "Confirmed platform constraints, each paired with what to do about it.",
  },
  {
    // Top-level on purpose. It reads as a landing page for event organisers,
    // not as reference material, and it gets shared on its own.
    slug: "hackathons",
    path: "/hackathons",
    keywords: ["hackathon hosting","free hosting for hackathon","Embarko Pro hackathon","deploy hackathon project"],
    title: "Hackathons",
    description: "Free Embarko Pro for every participant, and a Showcase page for your event.",
  },
];

export function docBySlug(slug: string): DocMeta | undefined {
  return DOCS.find((d) => d.slug === slug);
}

/** The markdown itself, keyed by slug. Every slug in DOCS must appear here. */
const MARKDOWN: Record<string, string> = {
  overview: overviewMd,
  capabilities: capabilitiesMd,
  api: apiMd,
  "agent-playbook": playbookMd,
  escalation: escalationMd,
  "agent-quickstart": quickstartMd,
  docs: docsMd,
  troubleshoot: troubleshootMd,
  "limitations-and-recommendations": limitationsMd,
  hackathons: hackathonsMd,
};

/**
 * The docs link to each other by markdown file name — `troubleshoot.md`, or
 * `docs.md#app-names`. Following one as-is would 404, or hand the
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

/**
 * The markdown for one published doc, or undefined if the slug isn't one we
 * publish. Nothing can fail at runtime here — the content is in the bundle, so
 * a missing file is a build error rather than a broken page.
 */
export function docMarkdown(slug: string): string | undefined {
  return MARKDOWN[slug];
}

/**
 * Resolves a raw-markdown filename to the doc it names, for the `.md` routes.
 *
 * A doc can be addressed two ways, because its page URL and its file name are
 * not always the same word — /docs/limitations is
 * limitations-and-recommendations.md. Both spellings resolve:
 *
 *   limitations.md                      (last segment of the page path)
 *   limitations-and-recommendations.md  (the file's own name)
 *
 * Returns undefined for anything not ending in `.md` and for any name that
 * isn't a doc we publish, so a caller can 404 on both without special-casing.
 */
export function docFileToSlug(file: string): string | undefined {
  if (!file.endsWith(".md")) return undefined;
  const name = file.slice(0, -".md".length);

  const bySlug = DOCS.find((d) => d.slug === name);
  if (bySlug) return bySlug.slug;

  /* e.g. "limitations" from the path "/docs/limitations". */
  const byPath = DOCS.find((d) => d.path.split("/").pop() === name);
  return byPath?.slug;
}

/** Every filename the `.md` routes answer to, for generateStaticParams(). */
export function docFileNames(): string[] {
  const names = new Set<string>();
  for (const doc of DOCS) {
    names.add(`${doc.slug}.md`);
    const leaf = doc.path.split("/").pop();
    if (leaf) names.add(`${leaf}.md`);
  }
  return [...names];
}
