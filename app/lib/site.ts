/**
 * Every Embarko hostname, in one place. Change a domain here and the whole
 * app follows — nothing else in app/ should spell out "embarko.ai" or
 * "embarko.app" directly.
 *
 * Files that can't import TypeScript (content/docs/*.md, public/llms.txt,
 * wrangler.jsonc, next.config.mjs, .env*) still carry the literal hostnames
 * and have to be updated by hand. So does the deploy script in the skill
 * repo (github.com/embarko-ai/skill).
 */

/** The marketing site + console host, no scheme. */
export const SITE_HOST = "embarko.ai";
/** The canonical public origin, with no trailing slash. */
export const SITE = `https://${SITE_HOST}`;

/** The deploy API host that agents talk to. */
export const SHIP_HOST = `ship.${SITE_HOST}`;
export const SHIP_URL = `https://${SHIP_HOST}`;

/** The domain every deployed app lives under: <app-name>.embarko.app */
export const APP_DOMAIN = "embarko.app";
export const appHost = (slug: string) => `${slug}.${APP_DOMAIN}`;
export const appUrl = (slug: string) => `https://${appHost(slug)}`;

/** The open-source Embarko agent skill. Linked from the footer, llms.txt and structured data. */
export const SKILL_REPO = `${SITE}/skill`;
