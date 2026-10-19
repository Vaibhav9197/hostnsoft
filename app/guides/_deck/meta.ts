/* The design layer of the guides index: how each guide is presented on
   /guides. Title, description, author, date and read time come from the
   guide's own markdown (app/lib/guides.ts), so they cannot drift from the
   article. A guide with no entry here still appears, with the defaults below.

   Publishing a guide: add its markdown, then one entry to DECK. */

export type CategoryId = "ai-tool" | "engineering" | "use-cases";

/** The tab bar. `all` always sits first; counts are derived, never typed. */
export const CATEGORIES: { id: "all" | CategoryId; label: string; headline: string }[] = [
  { id: "all", label: "All", headline: "If you have never deployed anything" },
  { id: "ai-tool", label: "AI tool", headline: "Guides for the tool you build in" },
  { id: "engineering", label: "Engineering", headline: "How deploying actually works" },
  { id: "use-cases", label: "Use cases", headline: "Guides for what you are building" },
];

export type Preview = { host: string; title: string; sub: string; rows: [string, string][] };

export type DeckEntry = {
  category: CategoryId;
  /** Where the reader's app is today; shown on the card's number badge. */
  kicker: string;
  /** Featured cards split the title across Inter and the serif italic. */
  titleLead?: string;
  titleTail?: string;
  /** A --g-* token in guides-deck.css. */
  accent: string;
  /** Keep exactly two featured guides, or the pair becomes one wide card. */
  featured?: boolean;
  /** 2 or 3 scene ids from scenes.js, in story order. */
  scenes: string[];
  /** The mock app inside the artwork. Give every guide a different one. */
  preview: Preview;
};

/* Order here is the order on the page (and the number on each card). */
export const DECK: Record<string, DeckEntry> = {
  "how-to-deploy-ai-app": {
    category: "engineering",
    kicker: "Any AI tool",
    titleLead: "How to deploy an AI app:",
    titleTail: "from idea to live link",
    accent: "any",
    featured: true,
    scenes: ["idea", "deploying", "live"],
    preview: {
      host: "trip-planner.embarko.app",
      title: "Barcelona",
      sub: "3 days · 12 places",
      rows: [["Sagrada Família", "10:00"], ["Park Güell", "09:30"], ["La Boqueria", "12:00"]],
    },
  },
  "host-website-built-with-claude": {
    category: "ai-tool",
    kicker: "Claude",
    titleLead: "How to host a website built with Claude",
    titleTail: "in 60 seconds",
    accent: "claude",
    featured: true,
    scenes: ["chat", "connector", "live"],
    preview: {
      host: "studio-site.embarko.app",
      title: "Studio",
      sub: "Selected work, 2026",
      rows: [["Index", "12 projects"], ["About", "updated"], ["Contact", "live"]],
    },
  },
  "deploy-from-cursor": {
    category: "ai-tool",
    kicker: "Cursor",
    accent: "cursor",
    scenes: ["editor", "deploying", "live"],
    preview: {
      host: "invoices.embarko.app",
      title: "Invoice 014",
      sub: "£1,240 · paid",
      rows: [["Design retainer", "£900"], ["Revisions", "£240"], ["VAT", "£100"]],
    },
  },
  "free-hosting-for-students": {
    category: "use-cases",
    kicker: "A class project",
    accent: "students",
    scenes: ["campus", "claim", "live"],
    preview: {
      host: "film-club.embarko.app",
      title: "Film club",
      sub: "7:30 · Room 204",
      rows: [["Thu — Chungking", "7:30"], ["Sign-up", "18 going"], ["North hall", "open"]],
    },
  },
  "deploy-replit-app-free": {
    category: "ai-tool",
    kicker: "Replit",
    accent: "replit",
    scenes: ["zip", "deploying", "live"],
    preview: {
      host: "tracker.embarko.app",
      title: "Move a little",
      sub: "7,492 steps today",
      rows: [["Monday", "6,210"], ["Tuesday", "7,492"], ["Streak", "11 days"]],
    },
  },
  "deploy-antigravity-website": {
    category: "ai-tool",
    kicker: "Antigravity",
    accent: "antigravity",
    scenes: ["editor", "sandbox", "live"],
    preview: {
      host: "aperitivo.embarko.app",
      title: "Bon Aperitivo",
      sub: "Fri, 8:00 pm · 4 covers",
      rows: [["Table 6", "8:00"], ["Table 2", "8:30"], ["Bar", "walk-in"]],
    },
  },
  "deploy-app-without-github": {
    category: "engineering",
    kicker: "A folder, no GitHub",
    accent: "folder",
    scenes: ["folder", "deploying", "live"],
    preview: {
      host: "recipes.embarko.app",
      title: "Weeknight pasta",
      sub: "25 min · 4 people",
      rows: [["Cacio e pepe", "15 min"], ["Puttanesca", "25 min"], ["Shopping", "9 items"]],
    },
  },
  "host-portfolio-website-free": {
    category: "use-cases",
    kicker: "A portfolio",
    accent: "portfolio",
    scenes: ["editor", "deploying", "live"],
    preview: {
      host: "jane-doe-portfolio.embarko.app",
      title: "Jane Doe",
      sub: "Product designer",
      rows: [["Case study: Lumen", "2026"], ["Side projects", "4"], ["Resume", "PDF"]],
    },
  },
};

/** What a guide without a DECK entry gets, so publishing never breaks the page. */
export const DEFAULT_ENTRY: DeckEntry = {
  category: "engineering",
  kicker: "Guide",
  accent: "any",
  scenes: ["deploying", "live"],
  preview: {
    host: "my-app.embarko.app",
    title: "My app",
    sub: "Live",
    rows: [["Home", "ok"], ["Data", "saved"], ["Link", "shared"]],
  },
};
