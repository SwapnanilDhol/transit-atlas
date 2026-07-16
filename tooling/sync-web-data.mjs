import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(workspaceRoot, "data/regions/in-maa");
const destinationRoot = resolve(
  workspaceRoot,
  "apps/web/public/data/in-maa",
);

const files = [
  "manifest.json",
  "region.json",
  "modes/metro/network.geojson",
  "modes/metro/network.json",
  "modes/metro/stations.geojson",
  "modes/metro/service-patterns.json",
  "modes/bus/network.json",
  "modes/bus/stops.geojson",
  "modes/bus/stop-matches.json",
  "projects/projects.json",
  "metadata/metro-quality.json",
  "metadata/bus-quality.json",
  "metadata/sources.json",
  "metadata/import-report.json",
];

await mkdir(destinationRoot, { recursive: true });

for (const file of files) {
  await mkdir(dirname(resolve(destinationRoot, file)), { recursive: true });
  await cp(resolve(sourceRoot, file), resolve(destinationRoot, file));
}

console.log(`Synced ${files.length} Chennai bundle files to the web app.`);
