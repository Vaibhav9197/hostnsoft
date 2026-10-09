/* The Live PRD as one serialisable object for the /admin/system page.
 *
 * Built on the server from loadSystemMap and storyHistories, so the client
 * never recomputes a fact and the markdown (scripts/build-prd.mjs) reads the
 * same functions.
 */
import type { Version } from "./history";
import {
  LANES,
  areaFiles,
  areasInNoStory,
  codeInNoStory,
  journeyAreas,
  journeyScreens,
  journeyTables,
  openSteps,
  proposedPurpose,
  stepFiles,
  stepRefs,
  stepServices,
  stepTables,
  tablesInNoStory,
  type Actor,
  type Flow,
  type Judge,
  type Lane,
  type Missing,
  type SystemMap,
} from "./map";

export type StepView = {
  id: string;
  title: string;
  plain: string;
  actor: Actor;
  choices: string[];
  failure: string[];
  areas: string[];
  refs: string[];
  files: string[];
  kept: string[];
  lookedUp: string[];
  services: string[];
  screens: string[];
};

export type JourneyView = {
  id: string;
  short: string;
  name: string;
  who: string;
  goal: string;
  outcome: string;
  steps: StepView[];
  screens: string[];
  areas: string[];
  kept: string[];
  lookedUp: string[];
};

export type AreaView = {
  id: string;
  name: string;
  lane: Lane;
  plain: string;
  detail: string | null;
  judge: Judge | null;
  files: string[];
  tables: string[];
  services: string[];
};

export type TableView = {
  id: string;
  name: string;
  store: string;
  storeLabel: string;
  external: boolean;
  /** Whether this page can read the table's rows (only the site database). */
  rows: boolean;
  note: string | null;
  migration: string | null;
  areas: string[];
  stories: string[];
};

export type RepoView = {
  id: string;
  name: string;
  plain: string;
  available: boolean;
  commit: string | null;
  counts: { screens: number; endpoints: number; modules: number; tables: number };
};

export type Model = {
  appName: string;
  repos: RepoView[];
  timeZone: string;
  lanes: typeof LANES;
  areas: AreaView[];
  flows: Flow[];
  journeys: JourneyView[];
  versions: Record<string, Version[]>;
  tables: TableView[];
  services: { id: string; name: string; type: string }[];
  prd: {
    purpose: string;
    people: { name: string; plain: string }[];
    counts: { screens: number; endpoints: number; modules: number; tables: number };
    stores: { name: string; engine: string; rows: boolean }[];
    externalStores: string[];
    services: string[];
    missing: Missing[];
    unplaced: string[];
    openSteps: { story: string; step: string; title: string }[];
    tablesInNoStory: string[];
    areasInNoStory: string[];
    endpointsInNoStory: string[];
  };
  commit: string | null;
};

export function buildModel(map: SystemMap, versions: Record<string, Version[]>, opts: { appName: string; timeZone: string }): Model {
  const storeLabel = new Map([...map.facts.stores, ...map.facts.externalStores].map((s) => [s.id, s.name]));
  const external = new Set(map.facts.externalStores.map((s) => s.id));

  const journeys: JourneyView[] = map.journeys.map((j) => {
    const t = journeyTables(map, j);
    return {
      id: j.id,
      short: j.short,
      name: j.name,
      who: j.who,
      goal: j.goal,
      outcome: j.outcome,
      screens: journeyScreens(map, j),
      areas: journeyAreas(j),
      kept: t.kept,
      lookedUp: t.lookedUp,
      steps: j.steps.map((s) => {
        const st = stepTables(map, s);
        const refs = stepRefs(map, s);
        return {
          id: s.id,
          title: s.title,
          plain: s.plain,
          actor: s.actor,
          choices: s.choices ?? [],
          failure: s.failure ?? [],
          areas: s.areas,
          refs,
          files: stepFiles(map, s),
          kept: st.kept,
          lookedUp: st.lookedUp,
          services: stepServices(map, s),
          screens: refs.filter((r) => r.startsWith("page:")).map((r) => r.slice(5)),
        };
      }),
    };
  });

  const tables: TableView[] = map.facts.tables.map((t) => ({
    id: t.id,
    name: t.name,
    store: t.store,
    storeLabel: storeLabel.get(t.store) ?? t.store,
    external: external.has(t.store),
    rows: map.facts.stores.find((x) => x.id === t.store)?.rows ?? false,
    note: t.note,
    migration: t.migration,
    areas: map.factAreas.get(t.id) ?? [],
    stories: journeys.filter((j) => j.kept.includes(t.id) || j.lookedUp.includes(t.id)).map((j) => j.id),
  }));

  const nameOfService = new Map(map.facts.services.map((s) => [s.id, s.name]));

  const count = (repo: string) => ({
    screens: map.facts.screens.filter((x) => x.repo === repo).length,
    endpoints: map.facts.endpoints.filter((x) => x.repo === repo).length,
    modules: map.facts.modules.filter((x) => x.repo === repo).length,
    tables: map.facts.tables.filter((x) => x.repo === repo).length,
  });

  return {
    appName: opts.appName,
    repos: map.facts.repos.map((r) => ({ id: r.id, name: r.name, plain: r.plain, available: r.available, commit: r.commit, counts: count(r.id) })),
    timeZone: opts.timeZone,
    lanes: LANES,
    areas: map.areas.map((a) => {
      const covered = map.areaFacts.get(a.id) ?? [];
      return {
        id: a.id,
        name: a.name,
        lane: a.lane,
        plain: a.plain,
        detail: a.detail ?? null,
        judge: a.judge ?? null,
        files: areaFiles(map, a.id),
        tables: covered.filter((x) => x.startsWith("table:")),
        services: covered.filter((x) => x.startsWith("ext:")),
      };
    }),
    flows: map.flows,
    journeys,
    versions,
    tables,
    services: map.facts.services,
    prd: {
      purpose: proposedPurpose(map, opts.appName),
      people: map.areas.filter((a) => a.lane === "people").map((a) => ({ name: a.name, plain: a.plain })),
      counts: {
        screens: map.facts.screens.length,
        endpoints: map.facts.endpoints.length,
        modules: map.facts.modules.length,
        tables: map.facts.tables.length,
      },
      stores: map.facts.stores.map((s) => ({ name: s.name, engine: s.engine, rows: s.rows })),
      externalStores: map.facts.externalStores.map((s) => s.name),
      services: map.facts.services.map((s) => nameOfService.get(s.id) ?? s.id),
      missing: map.missing,
      unplaced: map.unplaced,
      openSteps: map.journeys.flatMap((j) => openSteps(j).map((s) => ({ story: j.id, step: s.id, title: s.title }))),
      tablesInNoStory: tablesInNoStory(map),
      areasInNoStory: areasInNoStory(map).map((a) => a.id),
      endpointsInNoStory: codeInNoStory(map).endpoints,
    },
    commit: map.facts.commit,
  };
}
