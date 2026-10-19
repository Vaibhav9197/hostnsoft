/**
 * "Why Embarko" and the European hosting claim — written once, read by all
 * four landing versions, the docs, and llms.txt.
 *
 * WHY THIS IS A MODULE AND NOT FOUR COPIES OF SOME JSX
 * ----------------------------------------------------
 * Everything here is a factual claim about where customer data physically
 * sits and what has been certified about it. Those are the claims a customer's
 * procurement team reads, a DPA has to match, and a regulator can ask about.
 * Four hand-written copies across /v1../v4 drift, and the first one to drift
 * is the one that gets screenshotted.
 *
 * So: change a fact here, and every surface changes with it.
 *
 * WHAT WE ARE ALLOWED TO SAY  (read before editing — this wording is deliberate)
 * -----------------------------------------------------------------------------
 * Embarko runs customer apps on third-party managed infrastructure. That
 * provider holds the ISO/IEC 27001 certification. Embarko itself is NOT
 * certified.
 *
 * CORRECTED: this file previously claimed customer apps run in EU
 * datacenters. That was too strong. Confirmed 2026-10-19: the compute
 * provider runs apps in India, the United States and Europe, and each user's
 * data is held by country: India in India; EU, EEA, UK and Switzerland in
 * Europe; everyone else in the United States. Location is stated only
 * in the legal pages — the sub-processor table in app/dpa and "Where your data
 * is held" in app/privacy — and nowhere in this file or the docs.
 *
 * Three sentences we must never write, and why:
 *
 *   "Embarko is ISO 27001 certified."
 *       False. The certificate belongs to the infrastructure provider and
 *       covers their facilities and ISMS, not Embarko's.
 *
 *   "Embarko is a European company."
 *       False. The operating entity is SuperHeroes Inc., Indore, India.
 *
 *   "Your data stays in the EU." / "Your app runs in Europe."
 *       False as a blanket claim. Data is held in India, the United States or
 *       Europe depending on the user's country. Say nothing about location here;
 *       point at app/dpa, which is where residency has to be stated precisely
 *       and reviewed by a human.
 *
 * The provider is intentionally unnamed in customer-facing copy, by product
 * decision. Note that this is a presentational choice only: a DPA has to name
 * its sub-processors, so app/dpa/page.tsx's generic "Cloud infrastructure
 * provider" row still has to be named before launch.
 */

/** A single "why" pillar. `body` is one sentence; these get read in a row. */
export type Pillar = {
  id: string;
  /** Two or three words. Used as a heading and, in compact layouts, alone. */
  title: string;
  body: string;
};

/**
 * Why Embarko, in the order they should be read.
 *
 * Each of these is something Embarko does TODAY. Nothing aspirational lives
 * in this list — `public/llms.txt` tells agents in as many words that backups,
 * managed auth and a managed database do not exist yet, and a landing page
 * that hints otherwise makes that file a liar.
 */
export const WHY_EMBARKO: Pillar[] = [
  {
    id: "no-setup",
    title: "Nothing to set up",
    body:
      "No dashboard to learn, no build pipeline to wire, no YAML to write. You paste one prompt into the agent you already use and it deploys.",
  },
  {
    id: "it-runs",
    title: "It actually runs",
    body:
      "Not a static file host. Embarko executes your app, so a server, a database and a background request keep working once the link is live.",
  },
  {
    id: "survives",
    title: "Your data survives redeploys",
    body:
      "Storage under DATA_DIR is kept between deploys, so the records your app wrote yesterday are still there after your agent ships again today.",
  },
  {
    /* Was "A European home", claiming EU datacenters. Removed: apps do not
       run in the EU. What survives is the certification, which is real and
       is the provider's. */
    id: "certified",
    title: "Certified infrastructure",
    body:
      "Your app runs on managed infrastructure certified to ISO/IEC 27001 — audited by an external body, not self-declared.",
  },
  {
    id: "reversible",
    title: "Every deploy is reversible",
    body:
      "Each deploy records the version it shipped, and rollback puts the previous one back — so letting an agent ship often stays a safe thing to do.",
  },
  {
    id: "agent-readable",
    title: "Built to be read by an agent",
    body:
      "A machine-readable capabilities endpoint tells your agent what exists before it builds, so it designs around what Embarko can actually do.",
  },
];

/**
 * The infrastructure-trust story, broken out because it earns its own section
 * on the longer pages and a one-line strip on the shorter ones.
 *
 * Was EU_HOSTING / "Your app runs in Europe." Renamed and rewritten because
 * the location claim was false — see the CORRECTED note at the top of this
 * file. What is left is what can actually be stood behind: an externally
 * audited certification, real isolation, and GDPR terms in writing. No
 * sentence here says where an app runs, and none should be added.
 */
export const INFRA_TRUST = {
  eyebrow: "INFRASTRUCTURE",
  title: "Certified infrastructure, isolated by app.",
  /** The section standfirst. Says nothing about location, deliberately. */
  intro:
    "Where an app runs stops being a detail the moment it holds someone else's data. Embarko runs your app on managed infrastructure independently certified to ISO/IEC 27001, and gives every app its own isolated environment.",

  points: [
    {
      id: "iso",
      title: "ISO/IEC 27001 certified infrastructure",
      body:
        "The infrastructure Embarko runs on is certified to ISO/IEC 27001, the international standard for managing information security — audited by an external body, not self-declared.",
    },
    {
      id: "isolation",
      title: "Its own environment",
      /* Deliberately scoped to filesystem and storage isolation, which is real.
         It used to end "...and nothing else on the platform", which is a
         NETWORK isolation claim — and
         the old limitations doc said in as many words
         that container-to-container network isolation "has not been tested
         either way" and must not be relied on as a security boundary. Do not
         put that sentence back until the platform team has verified it. */
      body:
        "Each app runs in its own environment, with its own filesystem and its own persistent volume, separate from every other customer's app.",
    },
    {
      id: "encryption",
      title: "Encrypted in transit",
      body:
        "Every app is served over HTTPS, with certificates issued and renewed automatically. Environment variables are encrypted under a separate key and exposed only to your own app's runtime.",
    },
    {
      id: "gdpr",
      title: "GDPR, in writing",
      body:
        "You are the controller for the personal data your app processes and Embarko is your processor, under a DPA built on Article 28.",
    },
  ],

  /**
   * The honest footnote. It ships with the section rather than sitting in a
   * policy page nobody opens, because the distinction between "our provider is
   * certified" and "we are certified" is exactly the one that marketing copy
   * usually blurs — and the blur is what makes the claim worthless when
   * someone checks.
   */
  footnote:
    "ISO/IEC 27001 certification is held by the infrastructure provider Embarko runs on, and covers their facilities and information-security management. It is not a certification of Embarko itself. For where each category of data is processed, see the DPA.",

  /** Short form, for headers, footers and anywhere a whole section is too much. */
  strip: "ISO/IEC 27001 certified infrastructure · Every app isolated",
} as const;
