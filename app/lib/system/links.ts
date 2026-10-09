/* How tables link up, for the Live PRD's table views.
 *
 * The site database declares no foreign keys, so most links are inferred from
 * column names: `<x>_id` or `<x>_<key>` pointing at a table named after x
 * whose key is that column, and shared keys — a column named like another
 * table's single-column key (visitor_id, variant). Each link says which it
 * is, so an inferred one is never mistaken for a rule the database enforces.
 */

export type TableShape = { name: string; columns: string[]; pk: string[] };
export type Link = { from: string; fromColumn: string; to: string; toColumn: string; declared: boolean };

/** Column names whose values must never leave the server. */
export const SECRET_COLUMN = /token|secret|password|passwd|pass|api_key|auth_key|access_key|hook_key|hook_url/i;

const singular = (s: string) => (s.endsWith("ies") ? s.slice(0, -3) + "y" : s.endsWith("s") ? s.slice(0, -1) : s);

export function inferLinks(tables: TableShape[], declared: Link[] = []): Link[] {
  const out: Link[] = [...declared.map((l) => ({ ...l, declared: true }))];
  const seen = new Set(out.map((l) => `${l.from}.${l.fromColumn}`));
  const add = (l: Link) => {
    const key = `${l.from}.${l.fromColumn}`;
    if (seen.has(key) || (l.from === l.to && l.fromColumn === l.toColumn)) return;
    seen.add(key);
    out.push(l);
  };

  for (const t of tables) {
    for (const col of t.columns) {
      if (t.pk.length === 1 && t.pk[0] === col && col === "id") continue;
      const m = col.match(/^(.+)_([a-z]+)$/);
      if (m) {
        const [, stem, key] = m;
        /* `app_id` → showcase_apps.id; `collection_path` → showcase_collections.path. */
        const target = tables.find((o) => {
          if (o.name === t.name) return false;
          const s = singular(o.name);
          const named = o.name === stem || s === stem || s.endsWith(`_${stem}`);
          return named && o.columns.includes(key) && (o.pk.length === 0 || o.pk.includes(key) || key === "id");
        });
        if (target) {
          add({ from: t.name, fromColumn: col, to: target.name, toColumn: key, declared: false });
          continue;
        }
      }
      /* Shared keys: this column is another table's whole primary key. */
      const owner = tables.find((o) => o.name !== t.name && o.pk.length === 1 && o.pk[0] === col && col !== "id");
      if (owner && !(t.pk.length === 1 && t.pk[0] === col && owner.name > t.name)) {
        add({ from: t.name, fromColumn: col, to: owner.name, toColumn: col, declared: false });
      }
    }
  }
  return out;
}
