/* The Live PRD model: the scanned facts joined with the written story.
 *
 * Both outputs read this — the /admin/system page and scripts/build-prd.mjs —
 * so neither ever copies a fact by hand. Facts are passed in rather than
 * imported, because the page and the script load the generated JSON in
 * different ways.
 *
 * Every ID the story names is checked against the facts. One that no longer
 * exists comes back in `missing` (shown as stale); code no area claims comes
 * back in `unplaced` (shown as not explored yet).
 */
import { AREAS, FLOWS, JOURNEYS, type Area, type Flow, type Journey, type Lane, type Step } from "./story";

export type { Actor, Area, Flow, Journey, Judge, Lane, Step } from "./story";

export type Repo = { id: string; alias: string | null; name: string; plain: string; available: boolean; commit: string | null };
export type Screen = { id: string; repo: string; route: string; file: string; files: string[]; endpoints: string[]; imports: string[] };
export type Endpoint = {
  id: string;
  repo: string;
  route: string;
  file: string;
  methods: string[];
  inbound: boolean;
  imports: string[];
  /** Endpoints in this or another repo it calls. */
  calls: string[];
  tablesRead: string[];
  tablesWritten: string[];
  services: string[];
};
export type Module = {
  id: string;
  repo: string;
  file: string;
  summary: string | null;
  imports: string[];
  endpoints: string[];
  /** Express endpoints defined in this file. */
  defines: string[];
  tablesRead: string[];
  tablesWritten: string[];
  services: string[];
};
export type Table = { id: string; repo: string; store: string; name: string; migration: string; note: string | null; columns: string[] };
export type Service = { id: string; name: string; type: string };
export type Store = { id: string; repo: string; name: string; engine: string; binding: string; rows: boolean; tables: string[] };
export type Facts = {
  repos: Repo[];
  stores: Store[];
  externalStores: Store[];
  screens: Screen[];
  endpoints: Endpoint[];
  modules: Module[];
  tables: Table[];
  foreignKeys: { from: string; to: string }[];
  services: Service[];
  commit: string | null;
};

export type Fact =
  | ({ kind: "screen" } & Screen)
  | ({ kind: "endpoint" } & Endpoint)
  | ({ kind: "module" } & Module)
  | ({ kind: "table" } & Table)
  | ({ kind: "service" } & Service);

export type Missing = { ref: string; where: string };

export type SystemMap = {
  facts: Facts;
  byId: Map<string, Fact>;
  areas: Area[];
  flows: Flow[];
  journeys: Journey[];
  /** Area id → the fact IDs its refs cover, wildcards expanded. */
  areaFacts: Map<string, string[]>;
  /** Fact id → the areas that claim it. */
  factAreas: Map<string, string[]>;
  missing: Missing[];
  unplaced: string[];
};

export const LANES: { id: Lane; name: string; plain: string }[] = [
  { id: "people", name: "People", plain: "Who uses it" },
  { id: "screens", name: "Screens", plain: "What they see" },
  { id: "engine", name: "Engine", plain: "What answers them" },
  { id: "background", name: "Background", plain: "What runs on its own" },
  { id: "data", name: "Data", plain: "What gets written down" },
  { id: "outside", name: "Outside", plain: "Services we rely on" },
];

/** A ref ending in `/*` covers everything under that path. */
export function expandRef(ref: string, ids: string[]): string[] {
  if (ref.endsWith("/*")) {
    const prefix = ref.slice(0, -1);
    return ids.filter((id) => id.startsWith(prefix));
  }
  return ids.includes(ref) ? [ref] : [];
}

export function loadSystemMap(facts: Facts): SystemMap {
  const byId = new Map<string, Fact>();
  for (const s of facts.screens) byId.set(s.id, { kind: "screen", ...s });
  for (const e of facts.endpoints) byId.set(e.id, { kind: "endpoint", ...e });
  for (const m of facts.modules) byId.set(m.id, { kind: "module", ...m });
  for (const t of facts.tables) byId.set(t.id, { kind: "table", ...t });
  for (const x of facts.services) byId.set(x.id, { kind: "service", ...x });
  const ids = [...byId.keys()];

  const missing: Missing[] = [];
  const areaIds = new Set(AREAS.map((a) => a.id));
  const areaFacts = new Map<string, string[]>();
  const factAreas = new Map<string, string[]>();

  for (const area of AREAS) {
    const covered = new Set<string>();
    for (const ref of area.refs) {
      const hit = expandRef(ref, ids);
      if (hit.length === 0) missing.push({ ref, where: `area ${area.id}` });
      hit.forEach((h) => covered.add(h));
    }
    areaFacts.set(area.id, [...covered].sort());
    for (const id of covered) factAreas.set(id, [...(factAreas.get(id) ?? []), area.id]);
  }

  for (const flow of FLOWS) {
    if (!areaIds.has(flow.from)) missing.push({ ref: `area:${flow.from}`, where: `flow ${flow.from} → ${flow.to}` });
    if (!areaIds.has(flow.to)) missing.push({ ref: `area:${flow.to}`, where: `flow ${flow.from} → ${flow.to}` });
  }

  for (const j of JOURNEYS) {
    for (const step of j.steps) {
      const where = `story ${j.id}, step ${step.id}`;
      for (const ref of step.refs) if (expandRef(ref, ids).length === 0) missing.push({ ref, where });
      for (const a of step.areas) if (!areaIds.has(a)) missing.push({ ref: `area:${a}`, where });
    }
  }

  /* An Express endpoint belongs to whatever part holds the file defining it. */
  for (const m of facts.modules) {
    const areas = factAreas.get(m.id);
    if (!areas) continue;
    for (const e of m.defines ?? []) {
      if (factAreas.has(e)) continue;
      factAreas.set(e, areas);
      for (const a of areas) areaFacts.set(a, [...(areaFacts.get(a) ?? []), e]);
    }
  }

  const mustPlace = [
    ...facts.endpoints.map((e) => e.id),
    ...facts.modules.map((m) => m.id),
    ...facts.tables.filter((t) => !facts.externalStores.some((s) => s.id === t.store)).map((t) => t.id),
  ];
  const unplaced = mustPlace.filter((id) => !factAreas.has(id)).sort();

  return { facts, byId, areas: AREAS, flows: FLOWS, journeys: JOURNEYS, areaFacts, factAreas, missing, unplaced };
}

// --- derived views, shared by the page and the markdown ----------------------

export function stepRefs(map: SystemMap, step: Step): string[] {
  const ids = [...map.byId.keys()];
  return [...new Set(step.refs.flatMap((r) => expandRef(r, ids)))];
}

/** The files a fact lives in. A screen brings its folder's components. */
export function filesOf(map: SystemMap, id: string): string[] {
  const f = map.byId.get(id);
  if (!f) return [];
  if (f.kind === "screen") {
    /* The root route's folder is the whole app/, so only the page itself. A
       catch-all route's real UI sits one folder up. */
    if (f.route === "/") return [f.file];
    const files = [...f.files];
    if (/\/\[\.\.\.[^\]]+\]$/.test(f.route)) {
      const parent = f.file.split("/").slice(0, -2).join("/");
      for (const m of map.facts.modules) if (m.file.split("/").slice(0, -1).join("/") === parent) files.push(m.file);
    }
    return [...new Set(files)];
  }
  if (f.kind === "endpoint" || f.kind === "module") return [f.file];
  return [];
}

export function stepFiles(map: SystemMap, step: Step): string[] {
  return [...new Set(stepRefs(map, step).flatMap((id) => filesOf(map, id)))].sort();
}

export function areaFiles(map: SystemMap, areaId: string): string[] {
  return [...new Set((map.areaFacts.get(areaId) ?? []).flatMap((id) => filesOf(map, id)))].sort();
}

const isOwnTable = (map: SystemMap, id: string) => {
  const f = map.byId.get(id);
  return f?.kind === "table" && !map.facts.externalStores.some((s) => s.id === f.store);
};

/** Tables a step keeps (names or writes) and looks up (only reads). External
 *  tables are always looked up, never kept. */
export function stepTables(map: SystemMap, step: Step): { kept: string[]; lookedUp: string[] } {
  const kept = new Set<string>();
  const read = new Set<string>();
  for (const id of stepRefs(map, step)) {
    const f = map.byId.get(id);
    if (!f) continue;
    if (f.kind === "table") (isOwnTable(map, id) ? kept : read).add(id);
    if (f.kind === "endpoint" || f.kind === "module") {
      f.tablesWritten.forEach((t) => (isOwnTable(map, t) ? kept : read).add(t));
      f.tablesRead.forEach((t) => read.add(t));
    }
  }
  return { kept: [...kept].sort(), lookedUp: [...read].filter((t) => !kept.has(t)).sort() };
}

export function journeyTables(map: SystemMap, j: Journey): { kept: string[]; lookedUp: string[] } {
  const kept = new Set<string>();
  const read = new Set<string>();
  for (const s of j.steps) {
    const t = stepTables(map, s);
    t.kept.forEach((x) => kept.add(x));
    t.lookedUp.forEach((x) => read.add(x));
  }
  return { kept: [...kept].sort(), lookedUp: [...read].filter((t) => !kept.has(t)).sort() };
}

export function stepServices(map: SystemMap, step: Step): string[] {
  const out = new Set<string>();
  for (const id of stepRefs(map, step)) {
    const f = map.byId.get(id);
    if (f?.kind === "service") out.add(id);
    if (f?.kind === "endpoint" || f?.kind === "module") f.services.forEach((s) => out.add(s));
  }
  return [...out].sort();
}

export function journeyAreas(j: Journey): string[] {
  return [...new Set(j.steps.flatMap((s) => s.areas))];
}

export function journeyScreens(map: SystemMap, j: Journey): string[] {
  const out = new Set<string>();
  for (const s of j.steps) for (const id of stepRefs(map, s)) if (id.startsWith("page:")) out.add(id.slice(5));
  return [...out];
}

/** Automatic steps (not done by a person) with no failure written: open questions. */
export function openSteps(j: Journey): Step[] {
  return j.steps.filter((s) => s.actor !== "user" && !(s.failure && s.failure.length > 0));
}

/** Own-store tables no story keeps or looks up. */
export function tablesInNoStory(map: SystemMap): string[] {
  const used = new Set<string>();
  for (const j of map.journeys) {
    const t = journeyTables(map, j);
    [...t.kept, ...t.lookedUp].forEach((x) => used.add(x));
  }
  return map.facts.tables.filter((t) => isOwnTable(map, t.id) && !used.has(t.id)).map((t) => t.id);
}

/** Endpoints and modules no story step reaches, directly or through an area. */
export function codeInNoStory(map: SystemMap): { endpoints: string[]; modules: string[] } {
  const used = new Set<string>();
  for (const j of map.journeys) for (const s of j.steps) stepRefs(map, s).forEach((id) => used.add(id));
  return {
    endpoints: map.facts.endpoints.map((e) => e.id).filter((id) => !used.has(id)),
    modules: map.facts.modules.map((m) => m.id).filter((id) => !used.has(id)),
  };
}

/** Areas no story passes through. */
export function areasInNoStory(map: SystemMap): Area[] {
  const used = new Set(map.journeys.flatMap(journeyAreas));
  return map.areas.filter((a) => !used.has(a.id));
}

/** The purpose line, built from the stories: what the most common actor
 *  wants, then who else it serves. A proposal until a human confirms it. */
export function proposedPurpose(map: SystemMap, appName = "It"): string {
  const counts = new Map<string, number>();
  for (const j of map.journeys) counts.set(j.who, (counts.get(j.who) ?? 0) + 1);
  const who = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const goals = map.journeys.filter((j) => j.who === who).slice(0, 3).map((j) => j.goal);
  const others = map.areas
    .filter((a) => a.lane === "people" && !who.toLowerCase().includes(a.name.toLowerCase().replace(/s$/, "")))
    .map((a) => a.name.toLowerCase());
  const main = `${appName} lets ${who.charAt(0).toLowerCase()}${who.slice(1)} ${listOf(goals)}.`;
  return others.length ? `${main} It also serves ${listOf(others)}.` : main;
}

export function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}


/** "If <condition>" / "<result>" from a failure written as "Condition → result." */
export function splitFailure(text: string): { condition: string; result: string } {
  const [c, ...r] = text.split("→");
  const condition = c.trim();
  return {
    /* Lower-case the first letter, but not an acronym ("MSG91 …"). */
    condition: /^[A-Z][a-z]/.test(condition) ? condition.charAt(0).toLowerCase() + condition.slice(1) : condition,
    result: r.join("→").trim(),
  };
}
