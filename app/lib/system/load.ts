/* Loads the Live PRD for the /admin/system page.
 *
 * Production reads the facts bundled at build time (the Worker has no
 * filesystem). `next dev` re-scans the code on every load instead, so the page
 * is never behind what is on disk.
 */
import bundledFacts from "./facts.generated.json";
import history from "./history.generated.json";
import { storyHistories, type History } from "./history";
import { loadSystemMap, type Facts } from "./map";
import { buildModel, type Model } from "./model";

async function currentFacts(): Promise<Facts> {
  if (process.env.NODE_ENV === "development") {
    try {
      const path = await import("node:path");
      const fs = await import("node:fs");
      const { pathToFileURL } = await import("node:url");
      const file = path.join(process.cwd(), "scripts/build-system-map.mjs");
      /* Node caches an imported module for good; the version stamp makes an
         edited scanner load fresh instead of serving the old one. */
      const href = `${pathToFileURL(file).href}?v=${fs.statSync(file).mtimeMs}`;
      const scanner = await import(/* webpackIgnore: true */ href);
      return scanner.buildFacts() as Facts;
    } catch {
      /* Fall through to the last scan rather than break the page. */
    }
  }
  return bundledFacts as Facts;
}

export async function loadModel(): Promise<Model> {
  const map = loadSystemMap(await currentFacts());
  const versions = storyHistories(map, history as History);
  return buildModel(map, versions, { appName: "Embarko", timeZone: "Asia/Kolkata" });
}
