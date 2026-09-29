/**
 * Showcase page addresses — the part after /showcase/ in
 * embarko.ai/showcase/indore-ai-hack-day.
 *
 * The API owns the real rule; this file mirrors it so the create form can
 * shape and judge an address as it is typed, before any round trip. An
 * address is fixed once the page exists, so it is worth getting right here.
 */

/** Same pattern the API enforces: lowercase words joined by single dashes. */
export const SLUG_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/* /showcase/app/<slug>, /showcase/tag/<tag> and /showcase/category/<name>
   are routes of the public gallery, so a page can't live at those words.
   The API may not reserve them itself; the form blocks them either way. */
export const RESERVED_SLUGS: readonly string[] = ["app", "tag", "category"];

/* "Café" → "cafe": fold accented Latin letters onto their base letter rather
   than turning each into a dash. Anything with no Latin form (Hindi, emoji)
   still becomes a dash and drops out. */
function fold(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** The address a page name suggests: "Indore AI Hack Day" → "indore-ai-hack-day".
    Empty when the name has no a–z or 0–9 in it. */
export function slugFromName(name: string): string {
  return fold(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/**
 * Shapes an address on every keystroke. Unlike finalizeSlug it keeps one
 * trailing dash, because that dash is how the next word gets typed —
 * trimming it here made "my-event" impossible to type by hand.
 */
export function normalizeWhileTyping(raw: string): string {
  return fold(raw)
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-/, "")
    .slice(0, SLUG_MAX);
}

/** The address as it will be saved: typing rules, then no dash at either end. */
export function finalizeSlug(raw: string): string {
  return normalizeWhileTyping(raw).replace(/^-+|-+$/g, "");
}

export function isValidSlug(s: string): boolean {
  return s.length >= SLUG_MIN && s.length <= SLUG_MAX && SLUG_RULE.test(s);
}

export function isReserved(s: string): boolean {
  return RESERVED_SLUGS.includes(s);
}

/**
 * Free alternatives to try, in order, when `base` is taken: the year first
 * (the usual reason two events share a name), then -2 and -3. The base is
 * cut back so every candidate stays inside the length limit.
 */
export function suggestionCandidates(base: string, year: number): string[] {
  const suffixes = [/-\d{4}$/.test(base) ? null : `-${year}`, "-2", "-3"].filter(
    (s): s is string => s !== null,
  );
  const out: string[] = [];
  for (const suffix of suffixes) {
    const stem = base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, "");
    const candidate = `${stem}${suffix}`;
    if (stem && candidate !== base && !out.includes(candidate) && isValidSlug(candidate)) {
      out.push(candidate);
    }
  }
  return out;
}
