// Parsing for pasted or uploaded .env content.
//
// Deliberately not a full dotenv implementation: no variable interpolation
// (`$OTHER`), no multi-line values. Those would silently rewrite what someone
// pasted, and a wrong secret is worse than a rejected line.

export interface ParsedEnvLine {
  /** 1-based line number in the source, so the UI can point at a bad line. */
  line: number;
  raw: string;
}

export interface ParsedEnvVar extends ParsedEnvLine {
  key: string;
  value: string;
}

export interface ParsedEnvFile {
  /** Valid pairs, later duplicates of a key having replaced earlier ones. */
  vars: ParsedEnvVar[];
  /** Lines that looked like they meant something but couldn't be read. */
  invalid: (ParsedEnvLine & { reason: string })[];
  /** Keys that appeared more than once — the last value is the one kept. */
  duplicates: string[];
}

// Shell-ish env names. Anything else is far more likely a typo or a stray line
// of prose than a name the platform would accept.
//
// Exported because the single-variable form on the environment page needs the
// same test, and this must stay identical to the server's own check
// (hostnsoft-api's envVars.routes.ts and agentApps.routes.ts): the key is
// embedded as a bare, unquoted attribute name in generated Nomad job-spec
// HCL, so the API rejects anything else. Checking here only buys a better
// error — the server is the enforcement point, not this.
export const ENV_VAR_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEY = ENV_VAR_KEY;

export function parseEnvFile(text: string): ParsedEnvFile {
  const byKey = new Map<string, ParsedEnvVar>();
  const invalid: ParsedEnvFile["invalid"] = [];
  const duplicates: string[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();

    // Blank lines and whole-line comments aren't errors, they're just skipped.
    if (trimmed === "" || trimmed.startsWith("#")) return;

    // `export FOO=bar` is what you get from copying a shell snippet.
    const body = trimmed.replace(/^export\s+/, "");

    const eq = body.indexOf("=");
    if (eq === -1) {
      invalid.push({ line, raw, reason: "no “=” on this line" });
      return;
    }

    const key = body.slice(0, eq).trim();
    if (key === "") {
      invalid.push({ line, raw, reason: "no name before the “=”" });
      return;
    }
    if (!KEY.test(key)) {
      invalid.push({ line, raw, reason: `“${key}” isn’t a valid name` });
      return;
    }

    const value = readValue(body.slice(eq + 1));
    if (byKey.has(key) && !duplicates.includes(key)) duplicates.push(key);
    // Last one wins: when someone pastes over a block they've been editing,
    // the version further down is the one they just wrote.
    byKey.set(key, { key, value, line, raw });
  });

  return { vars: [...byKey.values()], invalid, duplicates };
}

function readValue(rest: string): string {
  const trimmed = rest.trim();

  // A quoted value is taken literally, so `#` and spaces inside it survive.
  // Only double quotes get escape sequences, matching shell behaviour.
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.length > 1) {
    const close = trimmed.indexOf(quote, 1);
    if (close !== -1) {
      const inner = trimmed.slice(1, close);
      return quote === '"' ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"') : inner;
    }
    // Unterminated quote: fall through and treat the whole thing as literal
    // rather than guessing where it was meant to end.
  }

  // Unquoted: a ` #` starts a trailing comment. Requiring the space means a
  // value that is itself full of hashes (a password, a colour) stays intact.
  return trimmed.replace(/\s+#.*$/, "").trim();
}
