/**
 * Names for deploy tokens, so nobody has to invent one.
 *
 * A token's name exists for one moment: the owner scanning the list deciding
 * which row to rotate or revoke. That makes a *handle* more useful than a
 * description — the panel can't know whether a token went to Claude Code, to
 * Cursor, or to a build server, so a name claiming to know is worse than one
 * that doesn't try. Two calm words are unique, memorable, and say nothing
 * false. The same convention names Heroku apps and Docker containers, so it
 * reads as a name rather than a riddle.
 */

/* Deliberately quiet and concrete: colours, materials, weather. Nothing
   jokey — these show up beside a credential someone is deciding whether to
   revoke, and whimsy reads as noise there. */
const ADJECTIVES = [
  "amber", "quiet", "copper", "golden", "silver", "velvet",
  "gentle", "hazel", "ivory", "slate", "dusty", "crisp",
  "warm", "still", "pale", "bright", "soft", "clear",
  "olive", "cobalt", "russet", "linen", "smoky", "mellow",
];

const NOUNS = [
  "falcon", "harbor", "mesa", "meadow", "canyon", "lantern",
  "compass", "willow", "summit", "beacon", "orchard", "cedar",
  "river", "garden", "anchor", "prairie", "cove", "ridge",
  "maple", "brook", "haven", "dune", "thicket", "quarry",
];

function pick(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * A fresh two-word name, avoiding any name in `taken`.
 *
 * 576 combinations against a handful of live tokens, so a few tries is
 * effectively always enough; the counter is there so an owner with an absurd
 * number of tokens still gets a name instead of a collision.
 */
export function randomTokenName(taken: Iterable<string> = []): string {
  const used = new Set(taken);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const name = `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
    if (!used.has(name)) return name;
  }
  const base = `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
  for (let n = 2; ; n += 1) {
    if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}
