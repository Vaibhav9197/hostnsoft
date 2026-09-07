/** The canonical list of AI agents the deploy prompt is known to work with —
 *  shared by the landing-page variants so a newly supported agent is added in
 *  one place instead of drifting between pages.
 *
 *  `slug` names the brand mark at `public/agenticons/agenticon-<slug>.svg`;
 *  every entry here must have a matching file. Display only — nothing rendered
 *  from this list is clickable. */
export interface Agent {
  slug: string;
  name: string;
}

export const AGENTS: readonly Agent[] = [
  { slug: "claudecode", name: "Claude Code" },
  { slug: "cursor", name: "Cursor" },
  { slug: "githubcopilot", name: "GitHub Copilot" },
  { slug: "codex", name: "Codex" },
  { slug: "gemini", name: "Gemini" },
  { slug: "antigravity", name: "Antigravity" },
  { slug: "cline", name: "Cline" },
  { slug: "opencode", name: "OpenCode" },
  { slug: "openclaw", name: "OpenClaw" },
  { slug: "lovable", name: "Lovable" },
  { slug: "grokbot", name: "Grok" },
  { slug: "perplexity", name: "Perplexity" },
  { slug: "hermes", name: "Hermes" },
  { slug: "pi", name: "Pi" },
];

/** Path to an agent's brand mark in `public/`. */
export function agentIconSrc(slug: string) {
  return `/agenticons/agenticon-${slug}.svg`;
}
