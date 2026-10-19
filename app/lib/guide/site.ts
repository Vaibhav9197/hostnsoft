/**
 * The agent guide as this site serves it.
 *
 * content.js holds every topic; markdown.js renders it; discovery.js builds
 * llms.txt, OpenAPI and the .well-known files. This file is the glue the
 * routes need: which topics exist, the sidebar, the page Markdown for a
 * browser, and the raw .md / .json files for agents.
 *
 * Links in the guide are absolute and always name the canonical host (SITE),
 * so a copied page still works when it is read somewhere else.
 */

import { SITE } from "../site";
import { ALIASES, RESERVED_EXAMPLES, SECTIONS, topics } from "./content";
import { index, indexMd, reservedNamesMd, topicJson, topicMd } from "./markdown";
import hackathonsMd from "../../../content/docs/hackathons.md";

export interface GuideTopic {
  topic: string;
  section: string;
  title: string;
  covers: string;
  summary: string;
}

export const GUIDE_TOPICS: GuideTopic[] = topics(SITE);

/** Pages under /docs that are not topics but still have a page and raw files. */
export const RESERVED_NAMES = "reserved-names";

export function findTopic(slug: string): GuideTopic | undefined {
  return GUIDE_TOPICS.find((t) => t.topic === slug);
}

/** An old or informal name for a topic ("domains", "secrets"), or undefined. */
export function aliasOf(slug: string): string | undefined {
  const target = (ALIASES as Record<string, string>)[slug.toLowerCase()];
  return target && target !== slug && findTopic(target) ? target : undefined;
}

export interface GuideNavItem {
  label: string;
  href: string;
  slug: string;
}
export interface GuideNavGroup {
  /** Section title. A section with one topic is a link itself (href set, no items). */
  title: string;
  href?: string;
  slug?: string;
  items: GuideNavItem[];
}

/* The sidebar: the same sections and numbering as the Markdown contents page,
   so a person and an agent see one structure. */
export const GUIDE_NAV: GuideNavGroup[] = [
  ...SECTIONS.map((s: { n: number; id: string; name: string }) => {
    const inSection = GUIDE_TOPICS.filter((t) => t.section === s.id);
    if (inSection.length === 1) {
      return { title: `${s.n}. ${s.name}`, href: `/docs/${inSection[0].topic}`, slug: inSection[0].topic, items: [] };
    }
    return {
      title: `${s.n}. ${s.name}`,
      items: inSection.map((t, i) => ({ label: `${s.n}.${i + 1} ${t.title}`, href: `/docs/${t.topic}`, slug: t.topic })),
    };
  }),
  {
    title: "Reference",
    items: [
      { label: "Reserved app names", href: `/docs/${RESERVED_NAMES}`, slug: RESERVED_NAMES },
      { label: "OpenAPI", href: "/openapi.json", slug: "openapi" },
      { label: "Pricing", href: "/pricing", slug: "pricing" },
    ],
  },
];

/**
 * A page's Markdown, ready for the browser. The frontmatter is for agents
 * and the "Guide home" line duplicates the sidebar, so both go.
 */
export function pageMarkdown(slug: string): string | undefined {
  let md: string;
  if (slug === RESERVED_NAMES) md = reservedNamesMd(SITE);
  else {
    const tp = findTopic(slug);
    if (!tp) return undefined;
    md = topicMd(SITE, tp);
  }
  return md
    .replace(/^---\n[\s\S]*?\n---\n+/, "")
    .replace(/^\[← Guide home\]\([^)]*\)\n+/m, "");
}

/** Search terms per page, for <meta name="keywords"> (docs/SEO.md rule 2). */
const KEYWORDS: Record<string, string[]> = {
  prerequisites: ["what is Embarko", "hosting for AI-built apps", "AI agent hosting rules", "deploy app built by AI"],
  connectors: ["Embarko connector", "Embarko MCP connector", "Claude connector for hosting", "deploy from Claude"],
  quickstart: ["Embarko quickstart", "deploy app with AI agent", "deploy without account", "AI agent deploy steps"],
  deploy: ["deploy app to Embarko", "app hosting requirements", "deploy API", "PORT and DATA_DIR"],
  errors: ["Embarko deploy errors", "fix failed deployment", "deploy error codes", "retry rules"],
  "static-sites": ["host static website", "deploy static site", "free static hosting", "index.html hosting"],
  data: ["persistent storage for apps", "SQLite hosting", "DATA_DIR", "save data across deploys"],
  "embarko-json": ["embarko.json", "app config file", "schedules config", "Embarko settings file"],
  schedules: ["cron jobs for hosted app", "scheduled tasks", "run app on a timer", "CRON_SECRET"],
  "two-apps": ["deploy frontend and backend", "separate API hosting", "monorepo deploy", "frontend backend apps"],
  "app-login": ["app login", "private app hosting", "password protect app", "user sign-in"],
  claim: ["keep temporary app", "claim app", "deploy token", "make app permanent"],
  resume: ["continue existing app", "find app status", "pick up deployed app", "agent handoff"],
  status: ["is my app live", "deploy status", "app status polling", "app crashed"],
  logs: ["app logs", "build logs", "why app crashed", "debug failed deploy"],
  "env-vars": ["environment variables", "add API key to app", "app secrets", "config for hosted app"],
  "custom-domain": ["custom domain", "connect own domain", "DNS record for app", "domain for AI-built app"],
  rollback: ["rollback deploy", "undo bad update", "restore previous version", "revert app"],
  analytics: ["app analytics", "app traffic", "app errors and memory", "how is my app doing"],
  rename: ["change app address", "rename app", "change subdomain", "move app URL"],
  delete: ["delete app", "remove hosted app", "take app offline", "delete deployment"],
  showcase: ["Embarko Showcase", "list app in gallery", "AI-built app gallery", "hackathon showcase"],
  feedback: ["report hosting bug", "feature request", "Embarko feedback", "docs issue"],
  [RESERVED_NAMES]: ["reserved app names", "app name not allowed", "app_name_reserved"],
};

export function pageKeywords(slug: string): string[] {
  return KEYWORDS[slug] ?? ["Embarko agent guide", "AI agent hosting"];
}

export interface RawFile {
  body: string;
  type: string;
  /** The HTML page this file is a copy of, for a canonical Link header. */
  page?: string;
}

const MD = "text/markdown; charset=utf-8";
const JSON_T = "application/json; charset=utf-8";

/**
 * The raw file behind a /docs URL: "quickstart.md", "quickstart.json",
 * "index.md", "hackathons.md". Undefined if there is no such file.
 */
export function rawFile(file: string): RawFile | undefined {
  const m = /^([a-z0-9-]+)\.(md|json)$/i.exec(file);
  if (!m) return undefined;
  const [, raw, ext] = m;
  const name = raw.toLowerCase();
  const json = ext.toLowerCase() === "json";

  if (name === "index") {
    return json
      ? { body: JSON.stringify(index(SITE), null, 2), type: JSON_T, page: `${SITE}/docs` }
      : { body: indexMd(SITE), type: MD, page: `${SITE}/docs` };
  }
  if (name === "hackathons" && !json) return { body: hackathonsMd, type: MD, page: `${SITE}/hackathons` };
  if (name === RESERVED_NAMES) {
    return json
      ? {
          body: JSON.stringify({ code: "app_name_reserved", note: "Some names are reserved for Embarko and never free. These are examples, not the full list.", examples: RESERVED_EXAMPLES }, null, 2),
          type: JSON_T,
          page: `${SITE}/docs/${RESERVED_NAMES}`,
        }
      : { body: reservedNamesMd(SITE), type: MD, page: `${SITE}/docs/${RESERVED_NAMES}` };
  }

  const tp = findTopic(name) ?? findTopic(aliasOf(name) ?? "");
  if (!tp) return undefined;
  const page = `${SITE}/docs/${tp.topic}`;
  return json
    ? { body: JSON.stringify(topicJson(SITE, tp), null, 2), type: JSON_T, page }
    : { body: topicMd(SITE, tp), type: MD, page };
}

/** Every raw file name, for generateStaticParams(). */
export function rawFileNames(): string[] {
  const names = ["index", RESERVED_NAMES, ...GUIDE_TOPICS.map((t) => t.topic)];
  return [...names.flatMap((n) => [`${n}.md`, `${n}.json`]), "hackathons.md"];
}
