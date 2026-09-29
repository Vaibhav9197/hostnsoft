/**
 * What the deploy endpoint will accept as an app name.
 *
 * Mirrors the `limits` block of https://ship.embarko.ai/capabilities/all, which is
 * the authoritative list — checked here as well so a name that can't work is
 * refused while the person is still looking at the field, rather than after an
 * upload has been packed and sent.
 *
 * An app name is also the live subdomain, so these are the rules that decide
 * whether <name>.embarko.app can exist at all.
 */

export const APP_NAME_MIN = 3;
export const APP_NAME_MAX = 63;
export const APP_NAME_PATTERN = /^[a-z0-9-]+$/;

/**
 * Names the platform keeps for itself.
 *
 * Capabilities calls these `app_name_reserved_examples` — so the real list is
 * longer than this, and a name that passes here can still come back rejected.
 * Catching the known ones is worth it anyway: they are the names people
 * actually reach for, and the endpoint's own refusal arrives much later.
 */
export const RESERVED_APP_NAMES = new Set([
  "ship",
  "api",
  "www",
  "login",
  "docs",
  "admin",
  "mail",
]);

/** The reason this name can't be used, or null if it can. */
export function appNameError(name: string): string | null {
  if (name.length < APP_NAME_MIN) {
    return `An app name needs at least ${APP_NAME_MIN} characters.`;
  }
  if (name.length > APP_NAME_MAX) {
    return `An app name can be at most ${APP_NAME_MAX} characters.`;
  }
  if (!APP_NAME_PATTERN.test(name)) {
    return "An app name can only use lowercase letters, numbers and dashes.";
  }
  if (RESERVED_APP_NAMES.has(name)) {
    return `“${name}” is reserved by Embarko. Try another name.`;
  }
  return null;
}
