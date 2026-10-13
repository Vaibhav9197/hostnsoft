/* Story versions, worked out from the committed git history of all three
 * repos (history.generated.json, written by scripts/build-system-history.mjs).
 * A sibling repo's paths carry its alias ("@api/src/…"), as the facts do.
 *
 * A commit belongs to a story when it changed one of the story's files, or a
 * migration naming one of its tables. Versions are numbered from the story's
 * first ever commit, so the newest has the highest number; only the newest
 * KEEP are returned.
 */
import { areaFiles, journeyAreas, journeyTables, stepFiles, type Journey, type SystemMap } from "./map";

export type Commit = {
  repo: string;
  sha: string;
  short: string;
  date: string;
  author: string;
  subject: string;
  body: string;
  files: { path: string; add: number; del: number }[];
  tables: string[];
};

export type RepoHistory = {
  url: string | null;
  commits: Commit[];
  firstSeen: Record<string, { short: string; date: string }>;
};

export type History = {
  generatedAt?: string;
  repos: Record<string, RepoHistory>;
};

export type Version = {
  n: number;
  repo: string;
  short: string;
  sha: string;
  date: string;
  author: string;
  subject: string;
  body: string;
  url: string | null;
  /** Step id → lines added and removed in that step's own files. */
  stepsChanged: { step: string; add: number; del: number }[];
  /** Steps whose every file was first added after this commit. */
  notBuilt: string[];
  areasChanged: string[];
  tablesChanged: string[];
  files: { path: string; add: number; del: number }[];
};

const KEEP = 15;

export function storyHistories(map: SystemMap, history: History): Record<string, Version[]> {
  /* One timeline across the repos, newest first. */
  const repos = history.repos ?? {};
  const commits = Object.values(repos)
    .flatMap((r) => r.commits)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const firstSeen = Object.assign({}, ...Object.values(repos).map((r) => r.firstSeen)) as RepoHistory["firstSeen"];
  const urls = Object.fromEntries(Object.entries(repos).map(([id, r]) => [id, r.url]));
  const builtBy = (file: string, c: Commit): boolean => {
    const first = firstSeen[file];
    if (!first) return true;
    if (first.short === c.short) return true;
    return Date.parse(first.date) <= Date.parse(c.date);
  };

  const out: Record<string, Version[]> = {};
  for (const j of map.journeys) out[j.id] = versionsOf(map, commits, urls, j, builtBy);
  return out;
}

function versionsOf(
  map: SystemMap,
  commits: Commit[],
  urls: Record<string, string | null>,
  j: Journey,
  builtBy: (file: string, c: Commit) => boolean,
): Version[] {
  const steps = j.steps.map((s) => ({ id: s.id, files: new Set(stepFiles(map, s)) }));
  const areas = journeyAreas(j).map((a) => ({ id: a, files: new Set(areaFiles(map, a)) }));
  const storyFiles = new Set(steps.flatMap((s) => [...s.files]));
  const t = journeyTables(map, j);
  const tableNames = new Set(
    [...t.kept, ...t.lookedUp].map((id) => map.byId.get(id)).flatMap((f) => (f?.kind === "table" ? [f.name] : [])),
  );

  const isMigration = (p: string) => /(^|\/)migrations\/.+\.sql$/.test(p);
  const mine = commits.filter(
    (c) => c.files.some((f) => storyFiles.has(f.path)) || c.tables.some((x) => tableNames.has(x)),
  );
  const total = mine.length;

  return mine.slice(0, KEEP).map((c, i) => {
    const byPath = new Map(c.files.map((f) => [f.path, f]));
    const sum = (files: Set<string>) => {
      let add = 0;
      let del = 0;
      let hit = false;
      for (const p of files) {
        const f = byPath.get(p);
        if (!f) continue;
        hit = true;
        add += f.add;
        del += f.del;
      }
      return { hit, add, del };
    };
    const stepsChanged = steps.flatMap((s) => {
      const r = sum(s.files);
      return r.hit ? [{ step: s.id, add: r.add, del: r.del }] : [];
    });
    const notBuilt = steps.filter((s) => s.files.size > 0 && [...s.files].every((f) => !builtBy(f, c))).map((s) => s.id);
    return {
      n: total - i,
      repo: c.repo,
      short: c.short,
      sha: c.sha,
      date: c.date,
      author: c.author,
      subject: c.subject,
      body: c.body,
      url: urls[c.repo] ? `${urls[c.repo]}/commit/${c.sha}` : null,
      stepsChanged,
      notBuilt,
      areasChanged: areas.filter((a) => sum(a.files).hit).map((a) => a.id),
      tablesChanged: c.tables.filter((x) => tableNames.has(x)),
      files: c.files.filter((f) => storyFiles.has(f.path) || (isMigration(f.path) && c.tables.some((x) => tableNames.has(x)))),
    };
  });
}
